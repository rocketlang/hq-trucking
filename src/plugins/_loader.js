const fs = require('fs');
const path = require('path');

function mountStatic(app){
  const pub = path.join(process.cwd(), 'public');
  app.get('/', (_req,res)=> res.redirect('/dashboard'));
  app.get('/dashboard', (_req,res)=> res.sendFile(path.join(pub, 'rates_admin.html')));
  app.get('/public/:file', (req,res)=>{
    const safe = path.normalize(req.params.file).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(pub, safe);
    if(!file.startsWith(pub)) return res.status(403).end('Forbidden');
    if(!fs.existsSync(file)) return res.status(404).end('Not found');
    res.sendFile(file);
  });
}

module.exports.loadPlugins = (app, _deps) => {
  mountStatic(app);
  // future: scan src/plugins/* and auto-mount plugin routes
};
