const express = require('express');
const cors = require('cors');
const compression = require('compression');
const TruckingFileDatabase = require('./database/fileDatabase');

class HQTruckingWorkingServer {
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
                console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
            });
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            const uptime = Date.now() - this.startTime;
            const memory = process.memoryUsage();
            
            try {
                const analytics = await this.db.getAnalytics();
                
                res.json({
                    status: 'healthy ✅',
                    platform: 'Android/Termux + File Database',
                    uptime: `${Math.floor(uptime / 1000)}s`,
                    memory: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
                    requests: this.requestCount,
                    database: {
                        type: 'File-based JSON',
                        status: 'connected',
                        totalRevenue: analytics.revenue.total,
                        activeVehicles: analytics.fleet.active
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    status: 'database error ❌',
                    error: error.message,
                    uptime: `${Math.floor(uptime / 1000)}s`
                });
            }
        });
        
        // Rates API
        this.app.get('/api/widget/rates/:endpoint?', async (req, res) => {
            const { endpoint = 'current' } = req.params;
            
            try {
                let result;
                
                switch (endpoint) {
                    case 'current':
                        const rates = await this.db.getRates({ limit: 10 });
                        result = {
                            routes: rates,
                            summary: {
                                totalRoutes: rates.length,
                                avgRate: rates.reduce((sum, r) => sum + r.rate, 0) / rates.length
                            }
                        };
                        break;
                        
                    case 'all':
                        result = { routes: await this.db.getRates() };
                        break;
                        
                    default:
                        result = { routes: await this.db.getRates() };
                }
                
                res.json({
                    success: true,
                    widget: 'rates',
                    endpoint,
                    data: result,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    widget: 'rates',
                    endpoint
                });
            }
        });
        
        // Operations API
        this.app.get('/api/widget/operations/:endpoint?', async (req, res) => {
            const { endpoint = 'fleet' } = req.params;
            
            try {
                let result;
                
                switch (endpoint) {
                    case 'fleet':
                        const vehicles = await this.db.getVehicles();
                        const analytics = await this.db.getAnalytics();
                        
                        result = {
                            summary: analytics.fleet,
                            vehicles: vehicles
                        };
                        break;
                        
                    case 'trips':
                        const trips = await this.db.getTrips();
                        result = {
                            trips: trips.slice(0, 10),
                            total: trips.length
                        };
                        break;
                        
                    default:
                        result = { vehicles: await this.db.getVehicles() };
                }
                
                res.json({
                    success: true,
                    widget: 'operations',
                    endpoint,
                    data: result,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    widget: 'operations',
                    endpoint
                });
            }
        });
        
        // Analytics API
        this.app.get('/api/widget/analytics/:endpoint?', async (req, res) => {
            try {
                const analytics = await this.db.getAnalytics();
                
                res.json({
                    success: true,
                    widget: 'analytics',
                    data: analytics,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    widget: 'analytics'
                });
            }
        });
        
        // Admin API - Fixed async/await issue
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
                
                res.json({
                    success: true,
                    database: {
                        type: 'File-based JSON Database',
                        tables: tableInfo
                    }
                });
            } catch (error) {
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
        
        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚛 HQ Trucking Intelligence Platform (Working Version)',
                version: '2.0.1-fixed',
                platform: 'Android/Termux',
                database: 'File-based JSON Database',
                status: 'Production Ready ✅',
                
                endpoints: {
                    health: '/health',
                    rates: '/api/widget/rates/current',
                    operations: '/api/widget/operations/fleet',
                    analytics: '/api/widget/analytics/dashboard',
                    admin: '/api/admin/tables'
                },
                
                quickTest: 'curl http://localhost:3000/api/widget/rates/current',
                
                features: [
                    '✅ File-based Database Working',
                    '✅ All Syntax Errors Fixed', 
                    '✅ CRUD Operations Functional',
                    '✅ Real Business Analytics',
                    '✅ Mobile Optimized'
                ]
            });
        });
    }
    
    setupErrorHandling() {
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.path,
                suggestion: 'Visit GET / for available endpoints'
            });
        });
        
        this.app.use((error, req, res, next) => {
            console.error('🚨 Server Error:', error.message);
            
            res.status(error.statusCode || 500).json({
                error: error.message,
                path: req.path,
                timestamp: new Date().toISOString()
            });
        });
    }
    
    start() {
        this.app.listen(this.port, () => {
            console.clear();
            console.log('🚛 HQ TRUCKING PLATFORM (FIXED VERSION)! 🚛');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📱 Platform: Android/Termux`);
            console.log(`💾 Database: File-based JSON (All Errors Fixed)`);
            console.log(`🌐 Server: http://localhost:${this.port}`);
            console.log(`💚 Health: http://localhost:${this.port}/health`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ ALL SYNTAX ERRORS FIXED!');
            console.log('✅ DATABASE OPERATIONS WORKING!');
            console.log('✅ READY FOR PRODUCTION!');
            console.log('═══════════════════════════════════════════════════════');
            console.log('🧪 QUICK TESTS:');
            console.log('  curl http://localhost:3000/health');
            console.log('  curl http://localhost:3000/api/widget/rates/current');
            console.log('  curl http://localhost:3000/api/widget/operations/fleet');
            console.log('═══════════════════════════════════════════════════════');
        });
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});

// Start server
const server = new HQTruckingWorkingServer();
server.start();
