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
app.get('/trucks', async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM trucks");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
