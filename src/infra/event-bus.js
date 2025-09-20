const { EventEmitter } = require('events');
class EventBus {
  constructor(){ this.ee = new EventEmitter(); this.ee.setMaxListeners(100); }
  publish(type, payload){ this.ee.emit(type, { type, ts: Date.now(), payload }); }
  subscribe(type, handler){ this.ee.on(type, handler); return () => this.ee.off(type, handler); }
}
module.exports = new EventBus();
