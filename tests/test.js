const http = require('http');

class HQTruckingTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    async runAllTests() {
        console.log('🧪 HQ Trucking Backend Test Suite');
        console.log('═══════════════════════════════════════════');
        
        await this.testHealthEndpoint();
        await this.testWidgetEndpoints();
        await this.testSagaFlow();
        await this.testPerformance();
        await this.testErrorHandling();
        
        this.showResults();
    }
    
    async testHealthEndpoint() {
        console.log('\n📊 Testing Health Endpoint...');
        
        const tests = [
            { name: 'Health Check', path: '/health', expectedStatus: 200 },
            { name: 'Root Endpoint', path: '/', expectedStatus: 200 },
            { name: 'Stats Endpoint', path: '/api/stats', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testWidgetEndpoints() {
        console.log('\n📱 Testing Widget Endpoints...');
        
        const widgets = [
            // Rates Widget Tests
            { name: 'Rates - Current', path: '/api/widget/rates/current', expectedStatus: 200 },
            { name: 'Rates - History', path: '/api/widget/rates/history', expectedStatus: 200 },
            { name: 'Rates - Predict', path: '/api/widget/rates/predict', expectedStatus: 200 },
            { name: 'Rates - Routes', path: '/api/widget/rates/routes', expectedStatus: 200 },
            
            // Analytics Widget Tests
            { name: 'Analytics - Dashboard', path: '/api/widget/analytics/dashboard', expectedStatus: 200 },
            { name: 'Analytics - Trends', path: '/api/widget/analytics/trends', expectedStatus: 200 },
            { name: 'Analytics - KPI', path: '/api/widget/analytics/kpi', expectedStatus: 200 },
            { name: 'Analytics - Revenue', path: '/api/widget/analytics/revenue', expectedStatus: 200 },
            
            // Operations Widget Tests  
            { name: 'Operations - Fleet', path: '/api/widget/operations/fleet', expectedStatus: 200 },
            { name: 'Operations - Routes', path: '/api/widget/operations/routes', expectedStatus: 200 },
            { name: 'Operations - Efficiency', path: '/api/widget/operations/efficiency', expectedStatus: 200 },
            { name: 'Operations - Tracking', path: '/api/widget/operations/tracking', expectedStatus: 200 },
            
            // Market Widget Tests
            { name: 'Market - Position', path: '/api/widget/market/position', expectedStatus: 200 },
            { name: 'Market - Competitors', path: '/api/widget/market/competitors', expectedStatus: 200 },
            { name: 'Market - Trends', path: '/api/widget/market/trends', expectedStatus: 200 },
            { name: 'Market - Forecast', path: '/api/widget/market/forecast', expectedStatus: 200 }
        ];
        
        for (const test of widgets) {
            await this.runTest(test);
        }
    }
    
    async testSagaFlow() {
        console.log('\n🔄 Testing Saga Flow (Rule 4)...');
        
        const sagaSteps = [
            { name: 'Saga - Quote', path: '/api/widget/saga/quote', expectedStatus: 200 },
            { name: 'Saga - Assign', path: '/api/widget/saga/assign', expectedStatus: 200 },
            { name: 'Saga - Track', path: '/api/widget/saga/track', expectedStatus: 200 },
            { name: 'Saga - POD', path: '/api/widget/saga/pod', expectedStatus: 200 },
            { name: 'Saga - Invoice', path: '/api/widget/saga/invoice', expectedStatus: 200 }
        ];
        
        for (const test of sagaSteps) {
            await this.runTest(test);
        }
    }
    
    async testPerformance() {
        console.log('\n⚡ Testing Performance (Rule 5)...');
        
        const performanceTests = [
            { name: 'Response Time < 2s', path: '/api/widget/rates/current', maxTime: 2000 },
            { name: 'Cache Performance', path: '/api/widget/analytics/dashboard', maxTime: 100 }, // Should be cached on second call
            { name: 'Large Dataset', path: '/api/widget/rates/history', maxTime: 2000 }
        ];
        
        for (const test of performanceTests) {
            await this.runPerformanceTest(test);
        }
    }
    
    async testErrorHandling() {
        console.log('\n❌ Testing Error Handling...');
        
        const errorTests = [
            { name: 'Invalid Widget', path: '/api/widget/invalid/test', expectedStatus: 500 },
            { name: 'Invalid Endpoint', path: '/api/widget/rates/invalid', expectedStatus: 500 },
            { name: '404 Not Found', path: '/api/invalid/path', expectedStatus: 404 }
        ];
        
        for (const test of errorTests) {
            await this.runTest(test);
        }
    }
    
    async runTest(test) {
        try {
            const result = await this.makeRequest(test.path);
            this.results.total++;
            
            if (result.statusCode === test.expectedStatus) {
                console.log(`  ✅ ${test.name}: PASSED (${result.statusCode})`);
                this.results.passed++;
            } else {
                console.log(`  ❌ ${test.name}: FAILED (Expected: ${test.expectedStatus}, Got: ${result.statusCode})`);
                this.results.failed++;
            }
        } catch (error) {
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
            this.results.failed++;
            this.results.total++;
        }
    }
    
    async runPerformanceTest(test) {
        try {
            const startTime = Date.now();
            const result = await this.makeRequest(test.path);
            const responseTime = Date.now() - startTime;
            
            this.results.total++;
            
            if (responseTime <= test.maxTime && result.statusCode === 200) {
                console.log(`  ✅ ${test.name}: PASSED (${responseTime}ms)`);
                this.results.passed++;
            } else {
                console.log(`  ❌ ${test.name}: FAILED (${responseTime}ms > ${test.maxTime}ms or status ${result.statusCode})`);
                this.results.failed++;
            }
        } catch (error) {
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
            this.results.failed++;
            this.results.total++;
        }
    }
    
    makeRequest(path) {
        return new Promise((resolve, reject) => {
            const req = http.get(`${this.baseUrl}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                });
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Request timeout')));
        });
    }
    
    showResults() {
        console.log('\n📋 TEST RESULTS');
        console.log('═══════════════════════════════════════════');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.total}`);
        console.log(`🎯 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
        console.log('═══════════════════════════════════════════');
        
        if (this.results.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Your HQ Trucking backend is working perfectly!');
        } else {
            console.log('⚠️  Some tests failed. Check the server logs for details.');
        }
    }
}

// Check if server is running before starting tests
async function checkServer() {
    try {
        const tester = new HQTruckingTester();
        await tester.makeRequest('/health');
        console.log('🌐 Server is running, starting tests...\n');
        await tester.runAllTests();
    } catch (error) {
        console.log('❌ Server is not running!');
        console.log('💡 Start the server first: npm start');
        console.log('   Then run tests: npm test');
    }
}

checkServer();
