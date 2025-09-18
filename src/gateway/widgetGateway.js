const EventEmitter = require('events');

class HQTruckingWidgetGateway extends EventEmitter {
    constructor() {
        super();
        this.widgetRegistry = new Map();
        this.cache = new Map();
        this.requestCount = 0;
        this.performanceMetrics = {
            totalRequests: 0,
            cacheHits: 0,
            avgResponseTime: 0,
            responseTimes: []
        };
        
        this.registerWidgets();
        console.log('🚛 HQ Trucking Widget Gateway initialized');
    }
    
    registerWidgets() {
        // Register trucking-specific widgets following your 5 hard rules
        this.widgetRegistry.set('rates', {
            service: 'rateIntelligence',
            endpoints: ['current', 'history', 'predict', 'routes'],
            maxCacheTime: 300, // 5 minutes - Rule 2: One place for caching
            budget: { maxSize: 150000, maxTime: 2000 } // Rule 5: Performance budget
        });
        
        this.widgetRegistry.set('analytics', {
            service: 'analytics',
            endpoints: ['dashboard', 'trends', 'kpi', 'revenue'],
            maxCacheTime: 600, // 10 minutes
            budget: { maxSize: 150000, maxTime: 2000 }
        });
        
        this.widgetRegistry.set('operations', {
            service: 'operations',
            endpoints: ['fleet', 'routes', 'efficiency', 'tracking'],
            maxCacheTime: 180, // 3 minutes
            budget: { maxSize: 150000, maxTime: 2000 }
        });
        
        this.widgetRegistry.set('market', {
            service: 'market',
            endpoints: ['position', 'competitors', 'trends', 'forecast'],
            maxCacheTime: 900, // 15 minutes
            budget: { maxSize: 150000, maxTime: 2000 }
        });
        
        this.widgetRegistry.set('saga', {
            service: 'orderSaga',
            endpoints: ['quote', 'assign', 'track', 'pod', 'invoice'],
            maxCacheTime: 60, // 1 minute - dynamic data
            budget: { maxSize: 150000, maxTime: 2000 }
        });
        
        console.log(`📋 Registered ${this.widgetRegistry.size} widgets`);
    }
    
    async handleRequest(request) {
        const startTime = Date.now();
        this.requestCount++;
        this.performanceMetrics.totalRequests++;
        
        try {
            const { widgetId, endpoint, method, query, body } = request;
            
            // Rule 1: All widgets go through gateway only
            if (!this.widgetRegistry.has(widgetId)) {
                throw new Error(`Widget '${widgetId}' not registered in gateway`);
            }
            
            const widgetConfig = this.widgetRegistry.get(widgetId);
            
            // Rule 2: Check cache first (one place for shape/caching)
            const cacheKey = this.generateCacheKey(widgetId, endpoint, query);
            const cached = this.getFromCache(cacheKey, widgetConfig.maxCacheTime);
            
            if (cached) {
                this.performanceMetrics.cacheHits++;
                console.log(`⚡ Cache hit: ${widgetId}/${endpoint}`);
                return this.formatResponse(cached, true, Date.now() - startTime);
            }
            
            // Route to microservice
            const serviceResponse = await this.routeToMicroservice(
                widgetConfig.service,
                endpoint,
                { method, query, body, widgetId }
            );
            
            // Rule 5: Check performance budget
            this.checkPerformanceBudget(serviceResponse, widgetConfig.budget, Date.now() - startTime);
            
            // Cache response
            this.setCache(cacheKey, serviceResponse);
            
            // Rule 3: Emit event for service synchronization
            this.emit('widgetResponse', {
                widgetId,
                endpoint,
                success: true,
                responseTime: Date.now() - startTime
            });
            
            const responseTime = Date.now() - startTime;
            this.updateMetrics(responseTime);
            
            console.log(`📱 Widget ${widgetId}/${endpoint} → ${responseTime}ms`);
            
            return this.formatResponse(serviceResponse, false, responseTime);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error(`❌ Widget request failed (${responseTime}ms):`, error.message);
            
            // Rule 3: Emit error event
            this.emit('widgetError', {
                error: error.message,
                responseTime
            });
            
            return this.formatErrorResponse(error, responseTime);
        }
    }
    
    async routeToMicroservice(serviceName, endpoint, params) {
        // This simulates microservice communication
        // In production, this would call actual microservices
        
        switch (serviceName) {
            case 'rateIntelligence':
                return await this.handleRateIntelligenceService(endpoint, params);
                
            case 'analytics':
                return await this.handleAnalyticsService(endpoint, params);
                
            case 'operations':
                return await this.handleOperationsService(endpoint, params);
                
            case 'market':
                return await this.handleMarketService(endpoint, params);
                
            case 'orderSaga':
                return await this.handleOrderSagaService(endpoint, params);
                
            default:
                throw new Error(`Microservice '${serviceName}' not available`);
        }
    }
    
    async handleRateIntelligenceService(endpoint, params) {
        // Simulated trucking rate intelligence
        const routes = [
            { id: 1, from: 'Mumbai', to: 'Delhi', rate: 45000, fuel: 8500, distance: 1420, trend: 'up', lastUpdated: new Date().toISOString() },
            { id: 2, from: 'Delhi', to: 'Kolkata', rate: 38000, fuel: 7200, distance: 1450, trend: 'stable', lastUpdated: new Date().toISOString() },
            { id: 3, from: 'Chennai', to: 'Bangalore', rate: 25000, fuel: 4800, distance: 350, trend: 'down', lastUpdated: new Date().toISOString() },
            { id: 4, from: 'Pune', to: 'Hyderabad', rate: 32000, fuel: 6100, distance: 560, trend: 'up', lastUpdated: new Date().toISOString() },
            { id: 5, from: 'Ahmedabad', to: 'Mumbai', rate: 28000, fuel: 5300, distance: 530, trend: 'stable', lastUpdated: new Date().toISOString() }
        ];
        
        switch (endpoint) {
            case 'current':
                return {
                    routes: routes.slice(0, 5),
                    summary: {
                        totalRoutes: routes.length,
                        avgRate: routes.reduce((sum, r) => sum + r.rate, 0) / routes.length,
                        trending: routes.filter(r => r.trend === 'up').length
                    },
                    timestamp: new Date().toISOString()
                };
                
            case 'history':
                return {
                    data: routes.map(r => ({
                        ...r,
                        history: this.generateRateHistory(r.rate)
                    })),
                    period: '30days',
                    totalDataPoints: routes.length * 30
                };
                
            case 'predict':
                return {
                    predictions: routes.map(r => ({
                        routeId: r.id,
                        route: `${r.from} → ${r.to}`,
                        currentRate: r.rate,
                        predictedRate: this.predictRate(r.rate, r.trend),
                        confidence: 0.85,
                        factors: ['fuel_price', 'demand', 'seasonal']
                    })),
                    modelVersion: '2.1.0',
                    lastTrained: '2024-01-15'
                };
                
            case 'routes':
                return {
                    availableRoutes: routes.map(r => ({
                        id: r.id,
                        name: `${r.from} → ${r.to}`,
                        distance: r.distance,
                        avgTime: Math.round(r.distance / 60), // Assuming 60 km/h avg
                        difficulty: r.distance > 1000 ? 'high' : 'medium'
                    })),
                    totalRoutes: routes.length
                };
                
            default:
                throw new Error(`Rate intelligence endpoint '${endpoint}' not found`);
        }
    }
    
    async handleAnalyticsService(endpoint, params) {
        switch (endpoint) {
            case 'dashboard':
                return {
                    revenue: {
                        total: 2850000,
                        monthly: 475000,
                        growth: 12.3
                    },
                    operations: {
                        totalTrips: 1247,
                        completedTrips: 1198,
                        onTimeDelivery: 96.2
                    },
                    efficiency: {
                        fuelEfficiency: 8.4,
                        vehicleUtilization: 84.7,
                        costPerKm: 18.45
                    },
                    timestamp: new Date().toISOString()
                };
                
            case 'trends':
                return {
                    revenue: this.generateTrendData(2850000, 'revenue'),
                    volume: this.generateTrendData(1247, 'trips'),
                    efficiency: this.generateTrendData(84.7, 'percentage'),
                    period: '6months'
                };
                
            case 'kpi':
                return {
                    financial: {
                        profitMargin: 35.4,
                        revenueGrowth: 12.3,
                        costReduction: 8.1
                    },
                    operational: {
                        onTimeDelivery: 96.2,
                        customerSatisfaction: 4.6,
                        vehicleUtilization: 84.7
                    },
                    market: {
                        marketShare: 18.4,
                        competitiveRank: 3,
                        brandIndex: 847
                    }
                };
                
            case 'revenue':
                return {
                    current: 2850000,
                    target: 3000000,
                    achievement: 95.0,
                    breakdown: {
                        longHaul: 1710000,
                        shortHaul: 855000,
                        specialCargo: 285000
                    },
                    forecast: 3200000
                };
                
            default:
                throw new Error(`Analytics endpoint '${endpoint}' not found`);
        }
    }
    
    async handleOperationsService(endpoint, params) {
        switch (endpoint) {
            case 'fleet':
                return {
                    vehicles: {
                        total: 156,
                        active: 132,
                        maintenance: 12,
                        idle: 12
                    },
                    utilization: 84.7,
                    efficiency: {
                        fuelConsumption: 8.4,
                        maintenanceCost: 12500,
                        driverSatisfaction: 4.2
                    }
                };
                
            case 'routes':
                return {
                    active: 45,
                    completed: 23,
                    planned: 18,
                    performance: {
                        avgDistance: 485,
                        avgDuration: 8.5,
                        onTimeRate: 96.2
                    }
                };
                
            case 'efficiency':
                return {
                    fuel: {
                        efficiency: 8.4,
                        cost: 125000,
                        savings: 15000
                    },
                    time: {
                        avgDeliveryTime: 8.5,
                        plannedVsActual: 98.2,
                        delays: 12
                    },
                    cost: {
                        perKm: 18.45,
                        perTrip: 8950,
                        optimization: 12.3
                    }
                };
                
            case 'tracking':
                return {
                    realTime: {
                        vehiclesTracked: 132,
                        lastUpdate: new Date().toISOString(),
                        accuracy: 99.8
                    },
                    alerts: [
                        { type: 'delay', vehicle: 'TN-456', route: 'Mumbai-Delhi', delay: 45 },
                        { type: 'maintenance', vehicle: 'KA-789', due: 'tomorrow' }
                    ]
                };
                
            default:
                throw new Error(`Operations endpoint '${endpoint}' not found`);
        }
    }
    
    async handleMarketService(endpoint, params) {
        switch (endpoint) {
            case 'position':
                return {
                    marketShare: 18.4,
                    ranking: 3,
                    brandIndex: 847,
                    competitorCount: 12,
                    growth: 15.2
                };
                
            case 'competitors':
                return {
                    competitors: [
                        { name: 'TruckCorp', share: 22.1, trend: 'stable', strength: 'network' },
                        { name: 'LogiMax', share: 19.8, trend: 'down', strength: 'pricing' },
                        { name: 'HQ Trucking', share: 18.4, trend: 'up', strength: 'technology' },
                        { name: 'FreightPro', share: 15.2, trend: 'up', strength: 'service' }
                    ],
                    analysis: 'Growing market share through technology innovation'
                };
                
            case 'trends':
                return {
                    demandGrowth: 8.5,
                    priceInflation: 4.2,
                    newEntrants: 3,
                    marketSize: 1250000000,
                    opportunities: ['electric_vehicles', 'last_mile_delivery', 'cold_chain']
                };
                
            case 'forecast':
                return {
                    nextQuarter: {
                        marketGrowth: 12.5,
                        demandIncrease: 18.3,
                        priceStability: 'moderate'
                    },
                    risks: ['fuel_volatility', 'regulation_changes'],
                    opportunities: ['route_optimization', 'fleet_expansion']
                };
                
            default:
                throw new Error(`Market endpoint '${endpoint}' not found`);
        }
    }
    
    async handleOrderSagaService(endpoint, params) {
        // Rule 4: Saga implementation for long flows
        switch (endpoint) {
            case 'quote':
                return {
                    quoteId: 'QT-' + Date.now(),
                    route: params.query?.route || 'Mumbai-Delhi',
                    rate: 45000,
                    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    steps: ['quote_generated', 'awaiting_confirmation'],
                    nextStep: 'assign'
                };
                
            case 'assign':
                return {
                    assignmentId: 'AS-' + Date.now(),
                    vehicleId: 'TN-456',
                    driverId: 'DR-123',
                    status: 'assigned',
                    steps: ['quote_confirmed', 'vehicle_assigned'],
                    nextStep: 'track'
                };
                
            case 'track':
                return {
                    trackingId: 'TR-' + Date.now(),
                    status: 'in_transit',
                    location: { lat: 19.0760, lng: 72.8777 },
                    progress: 45,
                    steps: ['departed', 'in_transit'],
                    nextStep: 'pod'
                };
                
            case 'pod':
                return {
                    podId: 'POD-' + Date.now(),
                    deliveredAt: new Date().toISOString(),
                    signature: 'digital_signature_hash',
                    status: 'delivered',
                    steps: ['delivered', 'pod_captured'],
                    nextStep: 'invoice'
                };
                
            case 'invoice':
                return {
                    invoiceId: 'INV-' + Date.now(),
                    amount: 45000,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'generated',
                    steps: ['invoice_generated', 'payment_pending'],
                    nextStep: 'complete'
                };
                
            default:
                throw new Error(`Order saga endpoint '${endpoint}' not found`);
        }
    }
    
    // Utility methods
    generateRateHistory(baseRate) {
        return Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rate: Math.round(baseRate * (0.95 + Math.random() * 0.1))
        }));
    }
    
    predictRate(currentRate, trend) {
        const multiplier = trend === 'up' ? 1.05 : trend === 'down' ? 0.95 : 1;
        return Math.round(currentRate * multiplier);
    }
    
    generateTrendData(baseValue, type) {
        return Array.from({ length: 6 }, (_, i) => ({
            month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].slice(0, 7),
            value: Math.round(baseValue * (0.9 + Math.random() * 0.2))
        }));
    }
    
    generateCacheKey(widgetId, endpoint, query) {
        const queryString = query ? JSON.stringify(query) : '';
        return `${widgetId}:${endpoint}:${Buffer.from(queryString).toString('base64')}`;
    }
    
    getFromCache(key, maxAge) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > maxAge * 1000) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setCache(key, data) {
        // Keep cache size manageable on mobile
        if (this.cache.size > 200) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    checkPerformanceBudget(response, budget, responseTime) {
        const responseSize = JSON.stringify(response).length;
        
        if (responseSize > budget.maxSize) {
            console.warn(`⚠️  Response size ${responseSize} exceeds budget ${budget.maxSize}`);
        }
        
        if (responseTime > budget.maxTime) {
            console.warn(`⚠️  Response time ${responseTime}ms exceeds budget ${budget.maxTime}ms`);
        }
    }
    
    updateMetrics(responseTime) {
        this.performanceMetrics.responseTimes.push(responseTime);
        
        if (this.performanceMetrics.responseTimes.length > 1000) {
            this.performanceMetrics.responseTimes.shift();
        }
        
        this.performanceMetrics.avgResponseTime = 
            this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / 
            this.performanceMetrics.responseTimes.length;
    }
    
    formatResponse(data, fromCache, responseTime) {
        const responseSize = JSON.stringify(data).length;
        
        return {
            success: true,
            data,
            meta: {
                cached: fromCache,
                responseTime: `${responseTime}ms`,
                size: `${Math.round(responseSize / 1024)}KB`,
                timestamp: new Date().toISOString(),
                requestCount: this.requestCount,
                gateway: 'HQ-Trucking-v1.0'
            }
        };
    }
    
    formatErrorResponse(error, responseTime) {
        return {
            success: false,
            error: error.message,
            meta: {
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString(),
                requestCount: this.requestCount,
                gateway: 'HQ-Trucking-v1.0'
            }
        };
    }
    
    getStats() {
        return {
            gateway: {
                registeredWidgets: Array.from(this.widgetRegistry.keys()),
                cacheSize: this.cache.size,
                totalRequests: this.requestCount,
                performance: this.performanceMetrics
            },
            system: {
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                platform: process.platform,
                nodeVersion: process.version
            }
        };
    }
}

module.exports = HQTruckingWidgetGateway;
