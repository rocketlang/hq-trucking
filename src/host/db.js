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
