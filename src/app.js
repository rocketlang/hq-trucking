.port}`);
            console.log(`💚 Health: http://localhost:${this.port}/health`);
            console.log(`📊 Stats: http://localhost:${this.port}/api/stats`);
            console.log(`📚 Docs: http://localhost:${this.port}/api/docs`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🔧 AVAILABLE WIDGETS:');
            console.log('  📈 rates      → /api/widget/rates/current');
            console.log('  📊 analytics  → /api/widget/analytics/dashboard');
            console.log('  ⚙️  operations → /api/widget/operations/fleet');
            console.log('  🎯 market     → /api/widget/market/position');
            console.log('  🔄 saga       → /api/widget/saga/quote');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('💡 QUICK TESTS:');
            console.log('  curl http://localhost:3000/health');
            console.log('  curl http://localhost:3000/api/widget/rates/current');
            console.log('  curl http://localhost:3000/api/docs');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🏗️  ARCHITECTURE RULES IMPLEMENTED:');
            console.log('  ✅ Rule 1: Widgets → Gateway only');
            console.log('  ✅ Rule 2: Gateway → Microservices (caching)');
            console.log('  ✅ Rule 3: Services use events for sync');
            console.log('  ✅ Rule 4: Sagas for long flows');
            console.log('  ✅ Rule 5: Performance budgets enforced');
            console.log('═══════════════════════════════════════════════════════════');
        });
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down HQ Trucking Platform...');
    console.log('👋 Thank you for using HQ Trucking Intelligence Platform!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Start the server
const server = new HQTruckingServer();
server.start();
