const fs = require('fs').promises;
const path = require('path');

class TruckingFileDatabase {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.tablesDir = path.join(this.dataDir, 'tables');
        this.backupDir = path.join(this.dataDir, 'backups');
        this.initialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Create directories
            await fs.mkdir(this.tablesDir, { recursive: true });
            await fs.mkdir(this.backupDir, { recursive: true });
            
            // Create tables with trucking data
            await this.createTables();
            
            this.initialized = true;
            console.log('💾 File Database initialized successfully!');
            console.log(`📁 Data directory: ${this.tablesDir}`);
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    
    async createTables() {
        const tables = {
            // Trucking rates data
            rates: [
                { id: 1, from: 'Mumbai', to: 'Delhi', rate: 45000, fuelCost: 8500, distance: 1420, trend: 'up', createdAt: '2024-01-15T10:00:00Z' },
                { id: 2, from: 'Delhi', to: 'Kolkata', rate: 38000, fuelCost: 7200, distance: 1450, trend: 'stable', createdAt: '2024-01-15T10:30:00Z' },
                { id: 3, from: 'Chennai', to: 'Bangalore', rate: 25000, fuelCost: 4800, distance: 350, trend: 'down', createdAt: '2024-01-15T11:00:00Z' },
                { id: 4, from: 'Pune', to: 'Hyderabad', rate: 32000, fuelCost: 6100, distance: 560, trend: 'up', createdAt: '2024-01-15T11:30:00Z' },
                { id: 5, from: 'Ahmedabad', to: 'Mumbai', rate: 28000, fuelCost: 5300, distance: 530, trend: 'stable', createdAt: '2024-01-15T12:00:00Z' },
                { id: 6, from: 'Kolkata', to: 'Bhubaneswar', rate: 22000, fuelCost: 4200, distance: 440, trend: 'up', createdAt: '2024-01-16T09:00:00Z' },
                { id: 7, from: 'Bangalore', to: 'Mysore', rate: 15000, fuelCost: 2800, distance: 150, trend: 'stable', createdAt: '2024-01-16T09:30:00Z' },
                { id: 8, from: 'Jaipur', to: 'Udaipur', rate: 18000, fuelCost: 3400, distance: 280, trend: 'up', createdAt: '2024-01-16T10:00:00Z' }
            ],
            
            // Vehicle fleet data
            vehicles: [
                { id: 1, number: 'MH-12-AB-1234', type: 'Heavy Truck', capacity: 25, status: 'active', driver: 'Rajesh Kumar', lastMaintenance: '2024-01-10', nextMaintenance: '2024-02-10' },
                { id: 2, number: 'DL-01-CD-5678', type: 'Medium Truck', capacity: 18, status: 'active', driver: 'Suresh Patel', lastMaintenance: '2024-01-08', nextMaintenance: '2024-02-08' },
                { id: 3, number: 'TN-09-EF-9012', type: 'Heavy Truck', capacity: 30, status: 'maintenance', driver: null, lastMaintenance: '2024-01-16', nextMaintenance: '2024-01-20' },
                { id: 4, number: 'KA-03-GH-3456', type: 'Light Truck', capacity: 12, status: 'active', driver: 'Ramesh Singh', lastMaintenance: '2024-01-12', nextMaintenance: '2024-02-12' },
                { id: 5, number: 'GJ-18-IJ-7890', type: 'Medium Truck', capacity: 20, status: 'idle', driver: 'Vikram Sharma', lastMaintenance: '2024-01-14', nextMaintenance: '2024-02-14' },
                { id: 6, number: 'UP-32-KL-2345', type: 'Heavy Truck', capacity: 28, status: 'active', driver: 'Mohan Yadav', lastMaintenance: '2024-01-11', nextMaintenance: '2024-02-11' }
            ],
            
            // Trip records
            trips: [
                { id: 1, vehicleId: 'MH-12-AB-1234', route: 'Mumbai-Delhi', status: 'completed', revenue: 45000, startDate: '2024-01-14', endDate: '2024-01-16', distance: 1420 },
                { id: 2, vehicleId: 'DL-01-CD-5678', route: 'Delhi-Kolkata', status: 'in-progress', revenue: null, startDate: '2024-01-16', endDate: null, distance: 1450 },
                { id: 3, vehicleId: 'KA-03-GH-3456', route: 'Chennai-Bangalore', status: 'completed', revenue: 25000, startDate: '2024-01-15', endDate: '2024-01-15', distance: 350 },
                { id: 4, vehicleId: 'UP-32-KL-2345', route: 'Pune-Hyderabad', status: 'completed', revenue: 32000, startDate: '2024-01-13', endDate: '2024-01-14', distance: 560 },
                { id: 5, vehicleId: 'GJ-18-IJ-7890', route: 'Ahmedabad-Mumbai', status: 'scheduled', revenue: null, startDate: '2024-01-18', endDate: null, distance: 530 }
            ],
            
            // Driver records
            drivers: [
                { id: 1, name: 'Rajesh Kumar', license: 'DL123456789', phone: '+91-9876543210', experience: 8, rating: 4.5, status: 'active' },
                { id: 2, name: 'Suresh Patel', license: 'GJ987654321', phone: '+91-9876543211', experience: 12, rating: 4.8, status: 'active' },
                { id: 3, name: 'Ramesh Singh', license: 'UP456789123', phone: '+91-9876543212', experience: 5, rating: 4.2, status: 'active' },
                { id: 4, name: 'Vikram Sharma', license: 'RJ789123456', phone: '+91-9876543213', experience: 10, rating: 4.6, status: 'active' },
                { id: 5, name: 'Mohan Yadav', license: 'UP321654987', phone: '+91-9876543214', experience: 7, rating: 4.3, status: 'active' }
            ],
            
            // Customer data
            customers: [
                { id: 1, name: 'Reliance Industries', contact: 'logistics@reliance.com', phone: '+91-22-12345678', address: 'Mumbai', rating: 5, totalBusiness: 2500000 },
                { id: 2, name: 'Tata Motors', contact: 'shipping@tatamotors.com', phone: '+91-20-87654321', address: 'Pune', rating: 4.8, totalBusiness: 1800000 },
                { id: 3, name: 'Infosys Limited', contact: 'transport@infosys.com', phone: '+91-80-11223344', address: 'Bangalore', rating: 4.9, totalBusiness: 950000 },
                { id: 4, name: 'Asian Paints', contact: 'logistics@asianpaints.com', phone: '+91-22-99887766', address: 'Mumbai', rating: 4.7, totalBusiness: 1200000 }
            ]
        };
        
        // Create table files
        for (const [tableName, data] of Object.entries(tables)) {
            const filePath = path.join(this.tablesDir, `${tableName}.json`);
            
            try {
                await fs.access(filePath);
                console.log(`📄 Table exists: ${tableName}`);
            } catch {
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                console.log(`📄 Created table: ${tableName} (${data.length} records)`);
            }
        }
    }
    
    // Core database operations
    async readTable(tableName) {
        try {
            const filePath = path.join(this.tablesDir, `${tableName}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error reading table ${tableName}:`, error.message);
            return [];
        }
    }
    
    async writeTable(tableName, data) {
        try {
            const filePath = path.join(this.tablesDir, `${tableName}.json`);
            
            // Create backup before writing
            await this.backup(tableName);
            
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`❌ Error writing table ${tableName}:`, error.message);
            return false;
        }
    }
    
    async backup(tableName) {
        try {
            const sourceFile = path.join(this.tablesDir, `${tableName}.json`);
            const backupFile = path.join(this.backupDir, `${tableName}_${Date.now()}.json`);
            
            const data = await fs.readFile(sourceFile);
            await fs.writeFile(backupFile, data);
        } catch (error) {
            // Backup failure is not critical
            console.warn(`⚠️  Backup failed for ${tableName}:`, error.message);
        }
    }
    
    // CRUD Operations
    async insert(tableName, record) {
        const data = await this.readTable(tableName);
        const newId = Math.max(...data.map(r => r.id || 0), 0) + 1;
        
        const newRecord = {
            ...record,
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.push(newRecord);
        await this.writeTable(tableName, data);
        
        console.log(`➕ Inserted record in ${tableName}: ID ${newId}`);
        return newRecord;
    }
    
    async find(tableName, filter = {}, options = {}) {
        const data = await this.readTable(tableName);
        let result = data;
        
        // Apply filters
        if (Object.keys(filter).length > 0) {
            result = data.filter(record => {
                return Object.entries(filter).every(([key, value]) => {
                    if (typeof value === 'string' && value.includes('*')) {
                        // Wildcard search
                        const regex = new RegExp(value.replace(/\*/g, '.*'), 'i');
                        return regex.test(record[key]);
                    }
                    return record[key] === value;
                });
            });
        }
        
        // Apply sorting
        if (options.sortBy) {
            result.sort((a, b) => {
                const aVal = a[options.sortBy];
                const bVal = b[options.sortBy];
                
                if (options.sortOrder === 'desc') {
                    return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
            });
        }
        
        // Apply pagination
        if (options.limit) {
            const start = options.offset || 0;
            result = result.slice(start, start + options.limit);
        }
        
        return result;
    }
    
    async update(tableName, id, updates) {
        const data = await this.readTable(tableName);
        const index = data.findIndex(r => r.id === id);
        
        if (index === -1) {
            throw new Error(`Record with ID ${id} not found in ${tableName}`);
        }
        
        data[index] = {
            ...data[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await this.writeTable(tableName, data);
        console.log(`✏️  Updated record in ${tableName}: ID ${id}`);
        
        return data[index];
    }
    
    async delete(tableName, id) {
        const data = await this.readTable(tableName);
        const filtered = data.filter(r => r.id !== id);
        
        if (filtered.length === data.length) {
            throw new Error(`Record with ID ${id} not found in ${tableName}`);
        }
        
        await this.writeTable(tableName, filtered);
        console.log(`🗑️  Deleted record from ${tableName}: ID ${id}`);
        
        return true;
    }
    
    // Trucking-specific business methods
    async getRates(options = {}) {
        return await this.find('rates', {}, { sortBy: 'createdAt', sortOrder: 'desc', ...options });
    }
    
    async addRate(rateData) {
        return await this.insert('rates', rateData);
    }
    
    async getVehicles(status = null) {
        const filter = status ? { status } : {};
        return await this.find('vehicles', filter);
    }
    
    async getTrips(status = null) {
        const filter = status ? { status } : {};
        return await this.find('trips', filter, { sortBy: 'startDate', sortOrder: 'desc' });
    }
    
    async getDrivers(status = 'active') {
        return await this.find('drivers', { status });
    }
    
    async getCustomers() {
        return await this.find('customers', {}, { sortBy: 'totalBusiness', sortOrder: 'desc' });
    }
    
    // Advanced analytics
    async getAnalytics() {
        try {
            const [trips, vehicles, rates, customers] = await Promise.all([
                this.getTrips(),
                this.getVehicles(),
                this.getRates(),
                this.getCustomers()
            ]);
            
            const completedTrips = trips.filter(t => t.status === 'completed');
            const totalRevenue = completedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
            const activeVehicles = vehicles.filter(v => v.status === 'active').length;
            const avgRate = rates.length > 0 ? rates.reduce((sum, r) => sum + r.rate, 0) / rates.length : 0;
            const totalCustomers = customers.length;
            const totalDistance = completedTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
            
            return {
                revenue: {
                    total: totalRevenue,
                    monthly: Math.round(totalRevenue / 3), // Assuming 3 months of data
                    growth: 12.3 // Mock growth rate
                },
                trips: {
                    total: trips.length,
                    completed: completedTrips.length,
                    inProgress: trips.filter(t => t.status === 'in-progress').length,
                    scheduled: trips.filter(t => t.status === 'scheduled').length,
                    completionRate: Math.round((completedTrips.length / trips.length) * 100)
                },
                fleet: {
                    total: vehicles.length,
                    active: activeVehicles,
                    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
                    idle: vehicles.filter(v => v.status === 'idle').length,
                    utilization: Math.round((activeVehicles / vehicles.length) * 100)
                },
                rates: {
                    average: Math.round(avgRate),
                    total: rates.length,
                    trending: {
                        up: rates.filter(r => r.trend === 'up').length,
                        down: rates.filter(r => r.trend === 'down').length,
                        stable: rates.filter(r => r.trend === 'stable').length
                    }
                },
                customers: {
                    total: totalCustomers,
                    totalBusiness: customers.reduce((sum, c) => sum + c.totalBusiness, 0),
                    avgRating: customers.reduce((sum, c) => sum + c.rating, 0) / totalCustomers
                },
                performance: {
                    totalDistance,
                    avgDistancePerTrip: Math.round(totalDistance / completedTrips.length) || 0,
                    revenuePerKm: totalDistance > 0 ? Math.round(totalRevenue / totalDistance) : 0
                }
            };
        } catch (error) {
            console.error('❌ Analytics calculation error:', error);
            throw error;
        }
    }
    
    // Database management
    async getTableInfo() {
        const tables = ['rates', 'vehicles', 'trips', 'drivers', 'customers'];
        const info = {};
        
        for (const table of tables) {
            const data = await this.readTable(table);
            info[table] = {
                recordCount: data.length,
                lastUpdated: data.length > 0 ? Math.max(...data.map(r => new Date(r.updatedAt || r.createdAt).getTime())) : null,
                sampleRecord: data[0] || null
            };
        }
        
        return info;
    }
}

module.exports = TruckingFileDatabase;
