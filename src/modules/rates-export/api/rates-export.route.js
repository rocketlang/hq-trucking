const express = require('express');
const router = express.Router();

// GET /api/rates-export?date=YYYY-MM-DD&from=City
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const from = req.query.from;

  let sql = "SELECT date,from_city,to_city,size,price,source,created_at FROM rates WHERE date = ?";
  const params = [date];
  if (from) { sql += " AND from_city = ?"; params.push(from); }
  sql += " ORDER BY from_city,to_city,size";

  const rows = await db.all(sql, params);

  // CSV helper
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (/[,\"\n]/.test(s)) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ['date','from_city','to_city','size','price','source','created_at'];
  const csv = [header.join(',')]
    .concat(rows.map(r => header.map(h => esc(r[h])).join(',')))
    .join('\n');

  const fname = `rates_${date}_${(from||'ALL').replace(/\s+/g,'_')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.send(csv);
});

module.exports = router;
