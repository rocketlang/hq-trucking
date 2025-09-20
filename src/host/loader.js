const fs = require('fs');
const path = require('path');

function discoverModules(root = path.join(__dirname, '..', 'modules')) {
  const mods=[];
  if (!fs.existsSync(root)) return mods;
  for (const dir of fs.readdirSync(root)) {
    const base = path.join(root, dir);
    const manPath = path.join(base, 'manifest.json');
    if (fs.existsSync(manPath)) {
      const manifest = JSON.parse(fs.readFileSync(manPath,'utf8'));
      mods.push({ id: dir, base, manifest });
    }
  }
  return mods;
}

function fsExistsDir(p){ try{ return require('fs').statSync(p).isDirectory(); }catch{ return false; } }
function fsList(p){ return require('fs').readdirSync(p); }

function mountModules(app, mods, express){
  const path = require('path');
  for (const mod of mods){
    // APIs
    const apiDir = path.join(mod.base, 'api');
    if (fsExistsDir(apiDir)){
      for (const f of fsList(apiDir)){
        if (f.endsWith('.route.js')) {
          const router = require(path.join(apiDir, f));
          app.use(`/api/${mod.manifest.name}`, router);
        }
      }
    }
    // Static widget UI (iframe) 
    const webDir = path.join(mod.base, 'web');
    if (fsExistsDir(webDir)){
      app.use(`/widgets/${mod.manifest.name}`, express.static(webDir));
    }
    // Event handlers
    const evDir = path.join(mod.base, 'events');
    if (fsExistsDir(evDir)){
      for (const f of fsList(evDir)){
        if (f.endsWith('.handler.js')) require(path.join(evDir, f))(app.locals.bus, app.locals.db);
      }
    }
  }
}

module.exports = { discoverModules, mountModules };
