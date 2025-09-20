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
