const express = require('express');
module.exports = (services) => {
  const r = express.Router();
  r.get('/rates', async (req,res,next)=>{
    try { res.json({ success:true, data: await services.rate.queries.list(req.query) }); }
    catch(e){ next(e); }
  });
  r.get('/rates/summary', async (req,res,next)=>{
    try { res.json({ success:true, data: await services.rate.queries.summary(req.query.date) }); }
    catch(e){ next(e); }
  });
  return r;
};
