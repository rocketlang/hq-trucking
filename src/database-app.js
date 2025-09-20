const express = require('express');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const TruckingFileDatabase = require('./database/fileDatabase');

// safe paths
const ROOT       = path.join(__dirname, '..');   // repo root (one level up from /src)
const PUBLIC_DIR = path.join(ROOT, 'public');

function contentTypeFor(ext) {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css':  return 'text/css';
    case '.js':   return 'application/javascript';
    case '.svg':  return 'image/svg+xml';
    case '.json': return 'application/json; charset=utf-8';
    default:      return 'text/plain; charset=utf-8';
  }
}

function servePublic(res, relPath) {
  // prevent ../ sneaking
  const safeRel = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safeRel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403; return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; return res.end(JSON.stringify({error:'Not found', path:'/public/'+safeRel})); }
    res.setHeader('Content-Type', contentTypeFor(path.extname(filePath).toLowerCase()));
    res.end(data);
  });
}

class HQTruckingDatabaseServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.startTime = Date.now();
    this.requestCount = 0;
    this.db = new TruckingFileDatabase();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(compression());
    this.app.use(cors());
    this.app.use(express.json({ limit: '5mb' }));

    this.app.use((req, res, next) => {
      this.requestCount++;
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const size = res.get('content-length') || 0;
        console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms, ${Math.round(size/1024)}KB)`);
      });
      next();
    });
  }

  setupRoutes() {
    // ===== New static serving =====
    this.app.get('/', (req, res) => {
      return servePublic(res, 'rates_admin.html');   // Boss demo dashboard
    });

    this.app.get('/dashboard', (req, res) => {
      return servePublic(res, 'rates_admin.html');
    });

    this.app.get('/public/*', (req, res) => {
      const rel = req.params[0];
      return servePublic(res, rel);
    });
    // ==============================

    // ---- Existing APIs (truncated here for clarity, keep your admin/rates, tables, backup, stats) ----
    this.app.post('/api/admin/rates', async (req, res) => {
      try {
        const newRate = await this.db.addRate(req.body);
        res.json({ 
          success: true, 
          message: 'Rate added successfully',
          data: newRate 
        });
      } catch (error) {
        res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    this.app.get('/api/admin/tables', async (req, res) => {
      try {
        const tableInfo = await this.db.getTableInfo();
        const analytics = await this.db.getAnalytics();
        res.json({
          success: true,
          database: {
            type: 'File-based JSON Database',
            location: this.db.tablesDir,
            tables: tableInfo,
            analytics: analytics,
            performance: {
              totalRecords: Object.values(tableInfo).reduce((sum, table) => sum + table.recordCount, 0),
              storageUsed: 'Calculating...'
            }
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // ... keep backup and stats endpoints same as your file ...

    // ---- Old root JSON → moved to /api ----
    this.app.get('/api', (req, res) => {
      res.json({
        message: '🚛 HQ Trucking Intelligence Platform (Database Edition)',
        version: '2.0.0-database',
        platform: 'Android/Termux',
        database: 'File-based JSON Database',
        status: 'Production Ready ✅',
        widgets: { /* ... same JSON content you had ... */ },
        admin: { /* ... */ },
        monitoring: { /* ... */ },
        quickStart: { /* ... */ },
        features: [ /* ... */ ]
      });
    });
  }

  setupErrorHandling() {
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        suggestion: 'Visit GET /api for available endpoints',
        availableWidgets: ['rates', 'operations', 'analytics', 'customers']
      });
    });

    this.app.use((error, req, res, next) => {
      console.error('🚨 Server Error:', error.message);
      console.error('Stack:', error.stack);
      res.status(error.statusCode || 500).json({
        error: error.message,
        path: req.path,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.clear();
      console.log('🚛 HQ TRUCKING DATABASE PLATFORM STARTED! 🚛');
      console.log(`🌐 Server: http://localhost:${this.port}`);
      console.log(`📂 Dashboard: http://localhost:${this.port}/`);
      console.log(`📂 API Docs: http://localhost:${this.port}/api`);
    });
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down HQ Trucking Database Platform...');
  console.log('💾 All data safely stored in files');
  process.exit(0);
});
process.on('SIGTERM', () => process.exit(0));

const server = new HQTruckingDatabaseServer();
server.start();
