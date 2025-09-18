const http = require('http');
const url = require('url');

class SimpleTruckingServer {
    constructor() {
        this.port = 3000;
        this.requestCount = 0;
        this.startTime = Date.now();
        
        this.data = {
            rates: [
                { id: 1, from: 'Mumbai', to: 'Delhi', rate: 45000, trend: 'up' },
                { id: 2, from: 'Delhi', to: 'Kolkata', rate: 38000, trend: 'stable' },
                { id: 3, from: 'Chennai', to: 'Bangalore', rate: 25000, trend: 'down' },
                { id: 4, from: 'Pune', to: 'Hyderabad', rate: 32000, trend: 'up' }
            ],
            vehicles: [
                { id: 1, number: 'MH-12-AB-1234', status: 'active' },
                { id: 2, number: 'DL-01-CD-5678', status: 'active' },
                { id: 3, number: 'TN-09-EF-9012', status: 'maintenance' }
            ]
        };
    }
    
    handleRequest(req, res) {
        this.requestCount++;
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        let response;
        
        try {
            if (path === '/health') {
                response = {
                    status: 'healthy',
                    platform: 'Android/Termux',
                    uptime: Math.floor((Date.now() - this.startTime) / 1000) + 's',
                    requests: this.requestCount,
                    message: 'HQ Trucking Server Running'
                };
            } else if (path === '/api/widget/rates/current') {
                response = {
                    success: true,
                    widget: 'rates',
                    data: {
                        routes: this.data.rates,
                        summary: {
                            totalRoutes: this.data.rates.length,
                            avgRate: Math.round(this.data.rates.reduce((sum, r) => sum + r.rate, 0) / this.data.rates.length)
                        }
                    }
                };
            } else if (path === '/api/widget/operations/fleet') {
                const active = this.data.vehicles.filter(v => v.status === 'active').length;
                response = {
                    success: true,
                    widget: 'operations', 
                    data: {
                        fleet: {
                            total: this.data.vehicles.length,
                            active: active,
                            utilization: Math.round((active / this.data.vehicles.length) * 100)
                        },
                        vehicles: this.data.vehicles
                    }
                };
            } else if (path === '/') {
                response = {
                    message: 'HQ Trucking Intelligence Platform',
                    version: '1.0.0-simple',
                    status: 'Working',
                    endpoints: {
                        health: '/health',
                        rates: '/api/widget/rates/current',
                        fleet: '/api/widget/operations/fleet'
                    },
                    quickTest: 'curl http://localhost:3000/health'
                };
            } else {
                response = { error: 'Not found', path: path };
                res.statusCode = 404;
            }
            
            res.end(JSON.stringify(response, null, 2));
            console.log(`${req.method} ${path} -> ${res.statusCode}`);
            
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
            console.error('Error:', error.message);
        }
    }
    
    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
        
        server.listen(this.port, () => {
            console.clear();
            console.log('HQ TRUCKING SERVER STARTED!');
            console.log('================================');
            console.log('Platform: Android/Termux');
            console.log('Dependencies: NONE (Pure Node.js)');
            console.log('Server: http://localhost:3000');
            console.log('Health: http://localhost:3000/health');
            console.log('================================');
            console.log('WORKING - No compilation errors!');
            console.log('================================');
            console.log('Test commands:');
            console.log('curl http://localhost:3000/health');
            console.log('curl http://localhost:3000/api/widget/rates/current');
            console.log('================================');
        });
        
        process.on('SIGINT', () => {
            console.log('\nShutting down...');
            process.exit(0);
        });
    }
}

const server = new SimpleTruckingServer();
server.start();
