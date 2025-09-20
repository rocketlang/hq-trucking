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
app.use(express.static(path.join(__dirname, '../public')));
// serve the dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});
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
