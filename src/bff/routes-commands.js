const express = require('express');
const { parse } = require('csv-parse');

module.exports = (services) => {
  const r = express.Router();

  r.post('/rates', async (req,res,next)=>{
    try { const data = await services.rate.commands.createRate(req.body); res.json({ success:true, data }); }
    catch(e){ next(e); }
  });

  // Accepts either JSON rows: { rows:[...]} or raw CSV text: { csv:"from,to,rate,...\n..." }
  r.post('/rates/import', async (req,res,next)=>{
    try {
      let rows = req.body.rows;
      if(!rows && req.body.csv){
        rows = await new Promise((resolve,reject)=>{
          parse(req.body.csv, { columns:true, trim:true }, (err, out)=> err?reject(err):resolve(out));
        });
      }
      if(!Array.isArray(rows)) rows = [];
      const result = await services.rate.commands.importRows(rows);
      res.json({ success:true, ...result });
    } catch(e){ next(e); }
  });

  return r;
};
