const { EventEmitter } = require('events');
const { v4: uuid } = require('uuid');
const db = require('./db');

const bus = new EventEmitter();

async function publish(topic, name, payload){
  await db.run(
    'INSERT INTO outbox (id, topic, name, payload, created_at) VALUES (?,?,?,?,?)',
    [uuid(), topic, name, JSON.stringify(payload||{}), Date.now()]
  );
}

async function tick(){
  const rows = await db.all(
    'SELECT * FROM outbox WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 50'
  );
  for (const m of rows){
    try{
      const payload = JSON.parse(m.payload);
      if (m.topic === 'event') {
        bus.emit(m.name, payload);
      } else if (m.topic === 'command') {
        bus.emit(m.name, payload);
      }
    }catch(e){
      console.error('bus error:', e.message);
    }finally{
      await db.run('UPDATE outbox SET processed_at=? WHERE id=?', [Date.now(), m.id]);
    }
  }
}

function start(intervalMs=400){
  setInterval(()=>tick().catch(console.error), intervalMs);
}

module.exports = { bus, publish, start };
