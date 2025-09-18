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
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
        
        // Backup and maintenance
        this.app.post('/api/admin/backup', async (req, res) => {
            try {
                const tables = ['rates', 'vehicles', 'trips', 'drivers', 'customers'];
                const backups = [];
                
                for (const table of tables) {
                    await this.db.backup(table);
                    backups.push(table);
                }
                
                res.json({
                    success: true,
                    message: 'Backup completed',
                    backupTables: backups,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Statistics and monitoring
        this.app.get('/api/stats', async (req, res) => {
            try {
                const memory = process.memoryUsage();
                const analytics = await this.db.getAnalytics();
                const tableInfo = await this.db.getTableInfo();
                
                res.json({
                    server: {
                        requests: this.requestCount,
                        uptime: Math.floor((Date.now() - this.startTime) / 1000),
                        memory: {
                            used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
                            total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
                            usage: `${Math.round((memory.heapUsed / memory.heapTotal) * 100)}%`
                        },
                        platform: 'Android/Termux'
                    },
                    database: {
                        type: 'File-based JSON',
                        tables: Object.keys(tableInfo),
                        totalRecords: Object.values(tableInfo).reduce((sum, table) => sum + table.recordCount, 0),
                        performance: 'Excellent'
                    },
                    business: {
                        revenue: analytics.revenue.total,
                        trips: analytics.trips.total,
                        vehicles: analytics.fleet.total,
                        customers: analytics.customers.total
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Root endpoint with comprehensive API documentation
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚛 HQ Trucking Intelligence Platform (Database Edition)',
                version: '2.0.0-database',
                platform: 'Android/Termux',
                database: 'File-based JSON Database',
                status: 'Production Ready ✅',
                
                widgets: {
                    rates: {
                        description: 'Trucking rate intelligence',
                        endpoints: [
                            'GET /api/widget/rates/current - Current rates',
                            'GET /api/widget/rates/all - All rates',
                            'GET /api/widget/rates/trending - Trending analysis',
                            'GET /api/widget/rates/search?from=X&to=Y - Search routes'
                        ]
                    },
                    operations: {
                        description: 'Fleet and operations management',
                        endpoints: [
                            'GET /api/widget/operations/fleet - Fleet status',
                            'GET /api/widget/operations/trips - Trip management',
                            'GET /api/widget/operations/drivers - Driver information'
                        ]
                    },
                    analytics: {
                        description: 'Business intelligence and metrics',
                        endpoints: [
                            'GET /api/widget/analytics/dashboard - Complete overview',
                            'GET /api/widget/analytics/revenue - Revenue analysis',
                            'GET /api/widget/analytics/efficiency - Efficiency metrics'
                        ]
                    },
                    customers: {
                        description: 'Customer relationship management',
                        endpoints: [
                            'GET /api/widget/customers/list - Customer data'
                        ]
                    }
                },
                
                admin: {
                    description: 'Database management and administration',
                    endpoints: [
                        'POST /api/admin/rates - Add new rate',
                        'GET /api/admin/tables - Database overview',
                        'POST /api/admin/backup - Create backup'
                    ]
                },
                
                monitoring: {
                    health: '/health - System health check',
                    stats: '/api/stats - Performance statistics'
                },
                
                quickStart: {
                    testRates: 'curl http://localhost:3000/api/widget/rates/current',
                    testFleet: 'curl http://localhost:3000/api/widget/operations/fleet',
                    testAnalytics: 'curl http://localhost:3000/api/widget/analytics/dashboard',
                    addRate: 'curl -X POST http://localhost:3000/api/admin/rates -H "Content-Type: application/json" -d \'{"from":"City1","to":"City2","rate":30000,"fuelCost":5000,"distance":400,"trend":"up"}\''
                },
                
                features: [
                    '✅ Persistent File-based Database',
                    '✅ Complete CRUD Operations', 
                    '✅ Real Business Analytics',
                    '✅ Fleet Management',
                    '✅ Rate Intelligence',
                    '✅ Customer Management',
                    '✅ Automatic Backups',
                    '✅ Performance Monitoring',
                    '✅ Mobile Optimized'
                ]
            });
        });
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.path,
                suggestion: 'Visit GET / for available endpoints',
                availableWidgets: ['rates', 'operations', 'analytics', 'customers']
            });
        });
        
        // Global error handler
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
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📱 Platform: Android/Termux`);
            console.log(`💾 Database: File-based JSON (Production Ready)`);
            console.log(`🌐 Server: http://localhost:${this.port}`);
            console.log(`💚 Health: http://localhost:${this.port}/health`);
            console.log(`📊 Stats: http://localhost:${this.port}/api/stats`);
            console.log(`🔧 Admin: http://localhost:${this.port}/api/admin/tables`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('💾 DATABASE FEATURES:');
            console.log('  📈 Real rate data with CRUD operations');
            console.log('  🚚 Complete fleet management');
            console.log('  👥 Driver and customer management');
            console.log('  📊 Live business analytics');
            console.log('  💾 Automatic backups and recovery');
            console.log('  🔍 Advanced search and filtering');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🚀 QUICK TESTS:');
            console.log('  curl http://localhost:3000/api/widget/rates/current');
            console.log('  curl http://localhost:3000/api/widget/operations/fleet');
            console.log('  curl http://localhost:3000/api/widget/analytics/dashboard');
            console.log('  curl http://localhost:3000/api/admin/tables');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📝 ADD NEW RATE:');
            console.log('  curl -X POST http://localhost:3000/api/admin/rates \\');
            console.log('    -H "Content-Type: application/json" \\');
            console.log('    -d \'{"from":"Kochi","to":"Trivandrum","rate":18000,"fuelCost":3200,"distance":220,"trend":"stable"}\'');
            console.log('═══════════════════════════════════════════════════════════');
        });
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down HQ Trucking Database Platform...');
    console.log('💾 All data safely stored in files');
    console.log('👋 Thank you for using HQ Trucking Intelligence Platform!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Start the server
const server = new HQTruckingDatabaseServer();
server.start();
