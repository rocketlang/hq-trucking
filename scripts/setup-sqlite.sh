#!/bin/bash
set -euo pipefail

ROOT="$HOME/hq-trucking"
SRC="$ROOT/src"
INFRA="$SRC/infra"
DATA="$ROOT/data"

echo "→ Ensuring folders…"
mkdir -p "$INFRA" "$DATA"

echo "→ Installing js SQLite (no native build)…"
# keep package.json minimal; install only what we need
npm init -y >/dev/null 2>&1 || true
npm pkg set type="commonjs" >/dev/null
npm install express cors compression sql.js nanoid --save

echo "→ Writing src/infra/sqlite.js …"
cat > "$INFRA/sqlite.js" <<'EOF'
// Lightweight SQLite wrapper using sql.js (WASM) for Termux/Android.
// Single file DB persisted to data/hqtrucking.sqlite

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.resolve(__dirname, '../../data/hqtrucking.sqlite');
const WASM_PATH = path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');

let SQL;        // sql.js module
let db;         // sql.js Database
let ready;      // Promise that resolves when DB is ready
let dirty = false;
let saveTimer = null;

async function init() {
  if (ready) return ready;
  ready = (async () => {
    SQL = await initSqlJs({
      locateFile: () => WASM_PATH,
    });

    if (fs.existsSync(DB_PATH)) {
      const filebuf = fs.readFileSync(DB_PATH);
      db = new SQL.Database(filebuf);
    } else {
      db = new SQL.Database();
    }

    // Schema (id is text for portability)
    db.exec(`
      PRAGMA journal_mode=MEMORY;
      CREATE TABLE IF NOT EXISTS rates (
        id TEXT PRIMARY KEY,
        from_city TEXT NOT NULL,
        to_city   TEXT NOT NULL,
        rate      INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS dispatches (
        id TEXT PRIMARY KEY,
        vehicle TEXT NOT NULL,
        driver  TEXT NOT NULL,
        status  TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // First run seed (only if empty)
    const res = db.exec("SELECT COUNT(*) as c FROM rates");
    const count = res.length ? res[0].values[0][0] : 0;
    if (count === 0) {
      db.exec(`
        INSERT INTO rates (id, from_city, to_city, rate) VALUES
          ('r1','Mumbai','Pune',12000),
          ('r2','Delhi','Jaipur',18000);
        INSERT INTO dispatches (id, vehicle, driver, status) VALUES
          ('d1','MH12AB1234','Ramesh','assigned'),
          ('d2','DL3CAB4567','Suresh','idle');
      `);
      dirty = true;
      scheduleSave();
    }
  })();
  return ready;
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    try {
      const data = Buffer.from(db.export());
      fs.writeFileSync(DB_PATH, data);
      dirty = false;
    } catch (e) {
      console.error('💾 DB save error:', e.message);
    } finally {
      saveTimer = null;
    }
  }, 250); // debounce writes
}

// Run a statement that changes data
async function run(sql, params = []) {
  await init();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  scheduleSave();
  return true;
}

// Get all rows from a SELECT
async function all(sql, params = []) {
  await init();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

// Get a single row (or undefined)
async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

// Close + persist (optional)
async function close() {
  if (!db) return;
  if (dirty) {
    const data = Buffer.from(db.export());
    fs.writeFileSync(DB_PATH, data);
    dirty = false;
  }
  db.close();
}

module.exports = { init, run, all, get, close, DB_PATH };
EOF

echo "→ Writing src/server.js …"
cat > "$SRC/server.js" <<'EOF'
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { nanoid } = require('nanoid');
const db = require('./infra/sqlite');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

// Health / info
app.get('/api', async (req, res) => {
  res.json({
    message: "📦 HQ Trucking Intelligence Platform",
    storage: "SQLite (sql.js / WASM)",
    db_file: (await db.init(), db.DB_PATH),
    status: "production ready ✅",
  });
});

// --- Rates (query + insert) ---
app.get('/rate', async (req, res, next) => {
  try {
    await db.init();
    const rows = await db.all('SELECT * FROM rates ORDER BY created_at DESC');
    res.json({ service: 'Rate Service', status: 'ok ✅', rows });
  } catch (e) { next(e); }
});

app.post('/rate', async (req, res, next) => {
  try {
    const { from_city, to_city, rate } = req.body || {};
    if (!from_city || !to_city || !rate) return res.status(400).json({ error: 'Missing fields' });
    await db.run('INSERT INTO rates (id, from_city, to_city, rate) VALUES (?, ?, ?, ?)',
      [nanoid(), from_city, to_city, Number(rate)]);
    res.json({ inserted: true });
  } catch (e) { next(e); }
});

// --- Dispatch (query) ---
app.get('/dispatch', async (req, res, next) => {
  try {
    await db.init();
    const rows = await db.all('SELECT * FROM dispatches ORDER BY created_at DESC');
    res.json({ service: 'Dispatch Service', status: 'ok ✅', rows });
  } catch (e) { next(e); }
});

// Fallback simple pages (so /dashboard and /trucking don’t 404)
app.get('/dashboard', (req, res) => {
  res.type('html').send(`<h1>Dashboard</h1><p>Use <code>/rate</code> and <code>/dispatch</code> for JSON.</p>`);
});
app.get('/trucking', (req, res) => {
  res.type('html').send(`<h1>Trucking</h1><p>Welcome to HQ Trucking.</p>`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥', err.message);
  res.status(500).json({ error: err.message });
});

// Start
app.listen(PORT, async () => {
  await db.init();
  console.clear();
  console.log('🚚 HQ TRUCKING (SQLite/wasm) STARTED!');
  console.log('🌐 Server:  http://localhost:' + PORT);
  console.log('📘 API:     http://localhost:' + PORT + '/api');
  console.log('💾 DB file:', (await db.init(), db.DB_PATH));
});
EOF

echo "→ Defining npm scripts…"
npm pkg set scripts.start="node ./src/server.js" >/dev/null
npm pkg set scripts.dev="node ./src/server.js" >/dev/null
npm pkg set scripts.stop="pkill -f 'src/server.js' || true" >/dev/null

echo "✅ Done. Run:  npm start"
