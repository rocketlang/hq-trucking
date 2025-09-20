const bus = require('../../infra/event-bus');
module.exports = (db) => ({
  async createRate(input){
    // basic validation
    const required = ['from','to','rate'];
    for (const k of required) if(!input[k]) throw new Error(`Missing field: ${k}`);
    const doc = {
      id: db.id(), date: input.date || new Date().toISOString().slice(0,10),
      from: input.from, to: input.to, rate: Number(input.rate),
      fuelCost: Number(input.fuelCost||0), distance: Number(input.distance||0),
      trend: input.trend || 'up', createdAt: new Date().toISOString()
    };
    await db.insert('rates', doc);
    bus.publish('RateCreated', { id: doc.id, from: doc.from, to: doc.to, date: doc.date });
    return doc;
  },
  async importRows(rows){
    let count = 0;
    for(const r of rows){
      const doc = {
        id: db.id(), date: r.date || new Date().toISOString().slice(0,10),
        from: r.from, to: r.to, rate: Number(r.rate||0),
        fuelCost: Number(r.fuelCost||0), distance: Number(r.distance||0),
        trend: r.trend || 'up', createdAt: new Date().toISOString()
      };
      await db.insert('rates', doc); count++;
    }
    bus.publish('RatesImported', { count });
    return { count };
  }
});
