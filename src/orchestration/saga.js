const bus = require('../infra/event-bus');
module.exports = function startSagas(){
  bus.subscribe('RatesImported', ({ payload }) => {
    console.log('🧩 Saga observed RatesImported:', payload);
  });
  bus.subscribe('RateCreated', ({ payload }) => {
    console.log('🧩 Saga observed RateCreated:', payload);
  });
};
