module.exports = (db) => ({
  async list({ from, to, date } = {}){
    return db.find('rates', r =>
      (!from || r.from===from) && (!to || r.to===to) && (!date || r.date===date)
    );
  },
  async summary(date){
    const day = await db.find('rates', r => !date || r.date===date);
    const total = day.length;
    const avgRate = total ? Math.round(day.reduce((a,b)=>a+(+b.rate||0),0)/total) : 0;
    return { total, avgRate };
  }
});
