const express = require('express');
const router = express.Router();

// GET /api/rates?date=YYYY-MM-DD&from=City
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const from = req.query.from;
  let sql = "SELECT * FROM rates WHERE date = ?";
  const params = [date];
  if (from) {
    sql += " AND from_city = ?";
    params.push(from);
  }
  const rows = await db.all(sql + " ORDER BY from_city,to_city,size", params);
  res.json({ date, from: from || "ALL", count: rows.length, data: rows });
});

// POST /api/rates/bulk-paste
router.post('/bulk-paste', async (req, res) => {
  const db = req.app.locals.db;
  const { origin, source, text } = req.body || {};
  const date = new Date().toISOString().slice(0,10);
  if (!origin || !text) {
    return res.status(400).json({ error: "origin and text required" });
  }

  // crude parser: one lane per line
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    // Example line: "Bombay jnpt MXL 60k"
    const m = line.match(/(.+)\s+(SXL|MXL)\s+(\d+)/i);
    if (!m) continue;
    const to = m[1].trim();
    const size = m[2].toUpperCase();
    const price = parseInt(m[3], 10) * 1000; // convert 60k -> 60000
    rows.push([date, origin.trim(), to, size, price, source || 'manual']);
  }

  if (!rows.length) return res.status(400).json({ error: "no lanes parsed" });

  const placeholders = rows.map(() => '(?,?,?,?,?,?)').join(',');
  const flat = rows.flat();
  await db.run(
    `INSERT OR REPLACE INTO rates(date,from_city,to_city,size,price,source) VALUES ${placeholders}`,
    flat
  );
  res.json({ inserted: rows.length });
});

module.exports = router;
