#!/usr/bin/env bash
set -euo pipefail
NAME="${1:?module name required}"
TITLE="${2:-$NAME}"
BASE="src/modules/$NAME"
mkdir -p "$BASE/api" "$BASE/web" "$BASE/events"
cat > "$BASE/manifest.json" <<JSON
{ "name":"$NAME", "title":"$TITLE", "version":"0.1.0", "type":"iframe", "entry":"index.html", "permissions":[] }
JSON
cat > "$BASE/api/$NAME.route.js" <<JS
const express = require('express'); const router = express.Router();
router.get('/', async (req,res)=> res.json({ service:"$NAME", status:"ok" }));
module.exports = router;
JS
cat > "$BASE/web/index.html" <<HTML
<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>$TITLE</title>
<h3>$TITLE</h3><p>Widget ready.</p>
HTML
echo "✅ Module created: $BASE"
echo "UI: /widgets/$NAME/    API: /api/$NAME/"
