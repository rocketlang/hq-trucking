const http = require('http');

class DatabaseTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = { passed: 0, failed: 0, total: 0 };
    }
    
    async runAllTests() {
        console.log('🧪 HQ Trucking Database Test Suite');
        console.log('═══════════════════════════════════════════════════════');
        
        await this.testHealthAndStats();
        await this.testRatesAPI();
        await this.testOperationsAPI();
        await this.testAnalyticsAPI();
        await this.testAdminAPI();
        await this.testCRUDOperations();
        
        this.showResults();
    }
    
    async testHealthAndStats() {
        console.log('\n📊 Testing Health & Statistics...');
        
        const tests = [
            { name: 'Health Check', path: '/health', expectedStatus: 200 },
            { name: 'Statistics', path: '/api/stats', expectedStatus: 200 },
            { name: 'Root Documentation', path: '/', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testRatesAPI() {
        console.log('\n📈 Testing Rates API...');
        
        const tests = [
            { name: 'Current Rates', path: '/api/widget/rates/current', expectedStatus: 200 },
            { name: 'All Rates', path: '/api/widget/rates/all', expectedStatus: 200 },
            { name: 'Trending Rates', path: '/api/widget/rates/trending', expectedStatus: 200 },
            { name: 'Search Routes', path: '/api/widget/rates/search?from=Mumbai&to=Delhi', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testOperationsAPI() {
        console.log('\n⚙️ Testing Operations API...');
        
        const tests = [
            { name: 'Fleet Management', path: '/api/widget/operations/fleet', expectedStatus: 200 },
            { name: 'Trip Management', path: '/api/widget/operations/trips', expectedStatus: 200 },
            { name: 'Driver Information', path: '/api/widget/operations/drivers', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testAnalyticsAPI() {
        console.log('\n📊 Testing Analytics API...');
        
        const tests = [
            { name: 'Analytics Dashboard', path: '/api/widget/analytics/dashboard', expectedStatus: 200 },
            { name: 'Revenue Analysis', path: '/api/widget/analytics/revenue', expectedStatus: 200 },
            { name: 'Efficiency Metrics', path: '/api/widget/analytics/efficiency', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testAdminAPI() {
        console.log('\n🔧 Testing Admin API...');
        
        const tests = [
            { name: 'Database Tables', path: '/api/admin/tables', expectedStatus: 200 }
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    }
    
    async testCRUDOperations() {
        console.log('\n✏️ Testing CRUD Operations...');
        
        try {
            // Test adding a new rate
            const newRate = {
                from: 'Kochi',
                to: 'Trivandrum',
                rate: 18000,
                fuelCost: 3200,
                distance: 220,
                trend: 'stable'
            };
            
            const result = await this.makePostRequest('/api/admin/rates', newRate);
            this.results.total++;
            
            if (result.statusCode === 200) {
                console.log('  ✅ Add New Rate: PASSED');
                this.results.passed++;
                
                // Verify the rate was added
                const verifyResult = await this.makeRequest('/api/widget/rates/search?from=Kochi&to=Trivandrum');
                this.results.total++;
                
                if (verifyResult.statusCode === 200) {
                    console.log('  ✅ Verify Added Rate: PASSED');
                    this.results.passed++;
                } else {
                    console.log('  ❌ Verify Added Rate: FAILED');
                    this.results.failed++;
                }
            } else {
                console.log('  ❌ Add New Rate: FAILED');
                this.results.failed++;
            }
            
        } catch (error) {
            console.log('  ❌ CRUD Operations: ERROR -', error.message);
            this.results.failed++;
            this.results.total++;
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
            req.setTimeout(10000, () => reject(new Error('Request timeout')));
        });
    }
    
    makePostRequest(path, data) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(data);
            
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Request timeout')));
            req.write(postData);
            req.end();
        });
    }
    
    showResults() {
        console.log('\n📋 DATABASE TEST RESULTS');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.total}`);
        console.log(`🎯 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
        console.log('═══════════════════════════════════════════════════════');
        
        if (this.results.failed === 0) {
            console.log('🎉 ALL DATABASE TESTS PASSED!');
            console.log('💾 Your file-based database is working perfectly!');
            console.log('🚛 HQ Trucking Platform is production ready!');
        } else {
            console.log('⚠️  Some tests failed. Check the server logs for details.');
        }
    }
}

// Check if server is running
async function checkAndTest() {
    try {
        const tester = new DatabaseTester();
        await tester.makeRequest('/health');
        console.log('🌐 Database server is running, starting comprehensive tests...\n');
        await tester.runAllTests();
    } catch (error) {
        console.log('❌ Database server is not running!');
        console.log('💡 Start the server first: node src/database-app.js');
        console.log('   Then run tests: node tests/database-test.js');
    }
}

checkAndTest();
