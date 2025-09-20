#!/usr/bin/env bash
set -euo pipefail

ROOT="$PWD"
SRC="$ROOT/src"
HOST="$SRC/host"
MODS="$SRC/modules"
PUB="$ROOT/public"
DATA="$ROOT/data"

echo "→ Ensuring folders…"
mkdir -p "$HOST" "$MODS" "$PUB" "$DATA" "$ROOT/scripts"

echo "→ Init npm + install deps…"
npm init -y >/dev/null 2>&1 || true
npm pkg set type="commonjs" >/dev/null
npm install express cors compression sql.js nanoid uuid --save

echo "→ Write host/db.js (sql.js SQLite adapter)…"
cat > "$HOST/db.js" <<'JS'
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.resolve(__dirname, '../../data/wowfreight.sqlite');
const WASM_PATH = path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');

let SQL, db, ready, dirty=false, timer=null;

async function init(){
  if (ready) return ready;
  ready = (async ()=>{
    SQL = await initSqlJs({ locateFile: () => WASM_PATH });
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    // Base schema (idempotent)
    db.exec(`
      PRAGMA journal_mode=MEMORY;
      -- Business: rates (simple)
      CREATE TABLE IF NOT EXISTS rates(
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        from_city TEXT NOT NULL,
        to_city   TEXT NOT NULL,
        size      TEXT NOT NULL,         -- SXL | MXL
        price     INTEGER NOT NULL,      -- INR
        source    TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_unique
        ON rates(date, from_city, to_city, size);

      -- Outbox for bus
      CREATE TABLE IF NOT EXISTS outbox(
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,             -- command | event
        name TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        processed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(processed_at);

      -- Saga instances (optional demo)
      CREATE TABLE IF NOT EXISTS saga_instances(
        saga_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  })();
  return ready;
}

function saveSoon(){
  dirty = true;
  if (timer) return;
  timer = setTimeout(()=>{
    try{
      const buf = Buffer.from(db.export());
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, buf);
      dirty = false;
    } finally { timer=null; }
  }, 200);
}

async function run(sql, params=[]){
  await init();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveSoon();
  return { ok:true };
}

async function all(sql, params=[]){
  await init();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows=[];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function get(sql, params=[]){
  const rows = await all(sql, params);
  return rows[0];
}

module.exports = { init, run, all, get, DB_PATH };
JS

echo "→ Write host/bus.js (simple bus + outbox polling)…"
cat > "$HOST/bus.js" <<'JS'
const { EventEmitter } = require('events');
const { v4: uuid } = require('uuid');
const db = require('./db');

const bus = new EventEmitter();

async function publish(topic, name, payload){
  await db.run(
    'INSERT INTO outbox (id, topic, name, payload, created_at) VALUES (?,?,?,?,?)',
    [uuid(), topic, name, JSON.stringify(payload||{}), Date.now()]
  );
}

async function tick(){
  const rows = await db.all(
    'SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 50'
  );
  for (const m of rows){
    try{
      const payload = JSON.parse(m.payload);
      if (m.topic === 'event') {
        bus.emit(m.name, payload);
      } else if (m.topic === 'command') {
        bus.emit(m.name, payload);
      }
    }catch(e){
      console.error('bus error:', e.message);
    }finally{
      await db.run('UPDATE outbox SET processed_at=? WHERE id=?', [Date.now(), m.id]);
    }
  }
}

function start(intervalMs=400){
  setInterval(()=>tick().catch(console.error), intervalMs);
}

module.exports = { bus, publish, start };
JS

echo "→ Write host/loader.js (module discovery + mounting)…"
cat > "$HOST/loader.js" <<'JS'
const fs = require('fs');
const path = require('path');

function discoverModules(root = path.join(__dirname, '..', 'modules')) {
  const mods=[];
  if (!fs.existsSync(root)) return mods;
  for (const dir of fs.readdirSync(root)) {
    const base = path.join(root, dir);
    const manPath = path.join(base, 'manifest.json');
    if (fs.existsSync(manPath)) {
      const manifest = JSON.parse(fs.readFileSync(manPath,'utf8'));
      mods.push({ id: dir, base, manifest });
    }
  }
  return mods;
}

function fsExistsDir(p){ try{ return require('fs').statSync(p).isDirectory(); }catch{ return false; } }
function fsList(p){ return require('fs').readdirSync(p); }

function mountModules(app, mods, express){
  const path = require('path');
  for (const mod of mods){
    // APIs
    const apiDir = path.join(mod.base, 'api');
    if (fsExistsDir(apiDir)){
      for (const f of fsList(apiDir)){
        if (f.endsWith('.route.js')) {
          const router = require(path.join(apiDir, f));
          app.use(`/api/${mod.manifest.name}`, router);
        }
      }
    }
    // Static widget UI (iframe) 
    const webDir = path.join(mod.base, 'web');
    if (fsExistsDir(webDir)){
      app.use(`/widgets/${mod.manifest.name}`, express.static(webDir));
    }
    // Event handlers
    const evDir = path.join(mod.base, 'events');
    if (fsExistsDir(evDir)){
      for (const f of fsList(evDir)){
        if (f.endsWith('.handler.js')) require(path.join(evDir, f))(app.locals.bus, app.locals.db);
      }
    }
  }
}

module.exports = { discoverModules, mountModules };
JS

echo "→ Write host/server.js (BFF host + registry)…"
cat > "$HOST/server.js" <<'JS'
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const db = require('./db');
const { bus, publish, start: startBus } = require('./bus');
const { discoverModules, mountModules } = require('./loader');

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// expose adapters to modules via locals
app.locals.db = db;
app.locals.bus = bus;
app.locals.publish = publish;

app.get('/api', async (req,res)=>{
  await db.init();
  res.json({
    service: 'WowFreightOS BFF',
    storage: 'SQLite (sql.js / WASM)',
    db_file: db.DB_PATH,
    status: 'ok ✅'
  });
});

// discover + mount modules (air-drop style)
const mods = discoverModules();
mountModules(app, mods, express);

// module registry for dashboard
app.get('/registry.json', (req,res)=>{
  res.json(mods.map(m=>({
    name: m.manifest.name,
    title: m.manifest.title,
    version: m.manifest.version,
    type: m.manifest.type,
    entry: `/widgets/${m.manifest.name}/${m.manifest.entry}`,
    permissions: m.manifest.permissions || []
  })));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async ()=>{
  await db.init();
  startBus(400);
  console.clear();
  console.log('🚚 WowFreightOS Host started');
  console.log('🌐 http://localhost:'+PORT);
  console.log('📘 API: /api   •   Registry: /registry.json');
});
JS

echo "→ Write public/dashboard.html (loads registry & iframes)…"
cat > "$PUB/dashboard.html" <<'HTML'
<!doctype html>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>WowFreightOS Dashboard</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Arial; margin:16px; color:#e6e6e6; background:#0f172a}
  h1{margin:0 0 12px}
  .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:12px}
  .card{background:#0b1220; border:1px solid #1f2937; border-radius:12px; padding:8px}
  iframe{width:100%; height:280px; border:0; background:#0b1220; border-radius:10px}
  .muted{opacity:.7}
</style>
<h1>WowFreightOS</h1>
<p class="muted">Auto-discovered widgets (iframe) from /registry.json</p>
<div class="grid" id="grid"></div>
<script>
async function boot(){
  const res = await fetch('/registry.json');
  const regs = await res.json();
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for(const w of regs){
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = \`<div style="display:flex;justify-content:space-between;align-items:center;">
      <strong>\${w.title}</strong><span class="muted">\${w.version}</span></div>\`;
    const ifr = document.createElement('iframe');
    ifr.src = w.entry; card.appendChild(ifr);
    grid.appendChild(card);
  }
}
boot();
</script>
HTML

echo "→ Scaffold example module: modules/rates …"
mkdir -p "$MODS/rates/api" "$MODS/rates/web" "$MODS/rates/events"

cat > "$MODS/rates/manifest.json" <<'JSON'
{
  "name": "rates",
  "title": "Daily Lane Rates",
  "version": "1.0.0",
  "type": "iframe",
  "entry": "index.html",
  "permissions": ["rates.read", "rates.write"]
}
JSON

cat > "$MODS/rates/api/rates.route.js" <<'JS'
const express = require('express');
const router = express.Router();

// GET /api/rates?date=YYYY-MM-DD&from=City
router.get('/', async (req,res)=>{
  const db = req.app.locals.db;
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const from = req.query.from;
  let sql = "SELECT * FROM rates WHERE date = ?";
  const params = [date];
  if (from) { sql += " AND from_city = ?"; params.push(from); }
  const rows = await db.all(sql + " ORDER BY from_city,to_city,size", params);
  res.json({ date, from: from || 'ALL', count: rows.length, data: rows });
});

// POST /api/rates/bulk-paste  { origin, text, source }
router.post('/bulk-paste', async (req,res)=>{
  const db = req.app.locals.db;
  const { origin, text, source } = req.body || {};
  const date = new Date().toISOString().slice(0,10);
  if (!origin || !text) return res.status(400).json({error:'origin and text required'});
  const norm = s => s.replace(/\s+/g,' ').trim()
    .replace(/jnpt/i,'JNPT Mumbai')
    .replace(/banglore/i,'Bangalore')
    .replace(/bhuvneshar|bhubneshar/i,'Bhubaneswar');
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const rows=[];
  for(const line of lines){
    // "Bombay jnpt MXL 60 k" | "Hyderabad sxl 32ft 62k"
    const cleaned = line.replace(/,|₹/g,'').replace(/\t/g,' ').replace(/ +/g,' ');
    const m = cleaned.match(/^([A-Za-z .]+?)\s+(SXL|MXL)\s+(?:\d{2}ft\s+)?(\d+)(?:k)?\b/i);
    if(!m) continue;
    const to = norm(m[1]);
    const size = m[2].toUpperCase();
    const raw = parseInt(m[3],10);
    const price = raw < 1000 ? raw*1000 : raw;
    rows.push([date, origin.trim(), to, size, price, source||'WhatsApp']);
  }
  if (!rows.length) return res.status(400).json({error:'no lanes parsed'});
  const placeholders = rows.map(()=>'(?,?,?,?,?,?)').join(',');
  const flat = rows.flat();
  await db.run(
    `INSERT OR REPLACE INTO rates(date,from_city,to_city,size,price,source) VALUES ${placeholders}`, flat
  );
  res.json({ inserted: rows.length });
});

module.exports = router;
JS

cat > "$MODS/rates/web/index.html" <<'HTML'
<!doctype html>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Rates</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Arial; margin:10px; color:#e6e6e6; background:#0b1220}
  input,button,select,textarea{background:#0b1220; color:#e6e6e6; border:1px solid #334155; border-radius:8px; padding:6px 8px}
  table{width:100%; border-collapse:collapse; margin-top:8px}
  th,td{border-bottom:1px solid #1f2937; padding:6px; text-align:left}
  .row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
  .ok{color:#4ade80} .err{color:#f87171}
</style>

<h3>Daily Lane Rates</h3>
<div class="row">
  <input id="date" type="date" />
  <input id="from" placeholder="From city (e.g., Kolkata)" />
  <button onclick="load()">Load</button>
</div>
<table id="tbl"><thead><tr>
  <th>From</th><th>To</th><th>Size</th><th>Price</th><th>Source</th>
</tr></thead><tbody></tbody></table>

<hr>
<h4>Quick Paste (Admin) — stays here for 1 month</h4>
<div class="row">
  <input id="origin" placeholder="Origin (e.g., Kolkata)" />
  <input id="source" placeholder="Source (WhatsApp: …)" />
  <button onclick="savePaste()">Save Parsed</button>
</div>
<textarea id="paste" placeholder="Bombay jnpt MXL 60 k\nHyderabad sxl 32ft 62k"></textarea>
<div id="msg"></div>

<script>
const $ = s => document.querySelector(s);
$('#date').value = new Date().toISOString().slice(0,10);

async function load(){
  const d = $('#date').value;
  const f = $('#from').value.trim();
  const q = new URLSearchParams({ date:d }); if (f) q.set('from', f);
  const res = await fetch('/api/rates?'+q.toString());
  const j = await res.json();
  const tb = $('#tbl tbody'); tb.innerHTML='';
  for (const r of j.data){
    const tr = document.createElement('tr');
    tr.innerHTML = \`<td>\${r.from_city}</td><td>\${r.to_city}</td><td>\${r.size}</td>
                    <td>₹ \${Number(r.price).toLocaleString()}</td><td>\${r.source||''}</td>\`;
    tb.appendChild(tr);
  }
}
load();

async function savePaste(){
  const origin = $('#origin').value.trim();
  const source = $('#source').value.trim();
  const text = $('#paste').value.trim();
  const msg = $('#msg'); msg.textContent=''; msg.className='';
  if(!origin||!text){ msg.textContent="Enter origin & paste text"; msg.className='err'; return; }
  const res = await fetch('/api/rates/bulk-paste',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({origin, source, text})});
  const j = await res.json();
  if(res.ok){ msg.textContent="Inserted "+j.inserted+" lanes."; msg.className='ok'; load(); }
  else { msg.textContent=j.error||'Error'; msg.className='err'; }
}
</script>
HTML

echo "→ Developer tool: scripts/new-module.sh (air-drop scaffold)…"
cat > "$ROOT/scripts/new-module.sh" <<'BASH2'
#!/usr/bin/env bash
set -euo pipefail
NAME="${1:?module name required}"
TITLE="${2:-$NAME}"
BASE="src/modules/$NAME"
mkdir -p "$BASE/api" "$BASE/web" "$BASE/events"
cat > "$BASE/manifest.json" <<JSON
{ "name":"$NAME", "title":"$TITLE", "version":"0.1.0", "type":"iframe", "entry":"index.html", "permissions":[] }
JSON
cat > "$BASE/api/$NAME.route.js" <<JS
const express = require('express'); const router = express.Router();
router.get('/', async (req,res)=> res.json({ service:"$NAME", status:"ok" }));
module.exports = router;
JS
cat > "$BASE/web/index.html" <<HTML
<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>$TITLE</title>
<h3>$TITLE</h3><p>Widget ready.</p>
HTML
echo "✅ Module created: $BASE"
echo "UI: /widgets/$NAME/    API: /api/$NAME/"
BASH2
chmod +x "$ROOT/scripts/new-module.sh"

echo "→ package.json scripts…"
npm pkg set scripts.start="node ./src/host/server.js" >/dev/null
npm pkg set scripts.dev="node ./src/host/server.js" >/dev/null
npm pkg set scripts.stop="pkill -f 'src/host/server.js' || true" >/dev/null

echo "→ All files written."
echo "→ Starting server…"
node ./src/host/server.js
