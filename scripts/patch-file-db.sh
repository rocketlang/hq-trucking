#!/bin/bash
set -euo pipefail

ROOT="$HOME/hq-trucking"
SRC="$ROOT/src"
INFRA="$SRC/infra"
PUB="$ROOT/public"

echo "→ Ensuring folders…"
mkdir -p "$INFRA" "$PUB" "$ROOT/data/tables"

echo "→ Writing src/infra/db-file.js…"
cat > "$INFRA/db-file.js" <<'EOF'
module.exports = {
  id: () => Math.random().toString(36).substring(2, 9),
  insert: (name, row) => {
    const rows = require(name);
    rows.push(row);
    return rows;
  },
  upsert: (name, row, key = 'id') => {
    const rows = require(name);
    const idx = rows.findIndex(r => r[key] === row[key]);
    if (idx >= 0) rows[idx] = row; else rows.push(row);
    return rows;
  },
  find: (name, predicate = () => true) => {
    const rows = require(name);
    return rows.filter(predicate);
  },
  all: (name) => require(name),
  replaceAll: (name, rows) => rows,
  tablesDir: "$ROOT/data/tables",
};
EOF

echo "→ Writing src/server.js…"
cat > "$SRC/server.js" <<'EOF'
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const db = require('./infra/db-file.js');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

app.get('/api', (req,res)=> {
  res.json({
    message: "🚚 HQ Trucking Intelligence Platform",
    version: "2.0.0",
    database: "File-based JSON",
    status: "production ready ✅"
  });
});

app.listen(PORT, () => {
  console.clear();
  console.log("🚛 HQ TRUCKING DATABASE STARTED!");
  console.log("🌐 Server: http://localhost:"+PORT);
});
EOF

echo "→ Cleaning deps…"
cd "$ROOT"
rm -rf node_modules package-lock.json 2>/dev/null || true
npm install express cors compression

echo "→ Stopping any running server…"
pkill -f "src/server.js" 2>/dev/null || true
pkill -f "src/database-app.js" 2>/dev/null || true

echo "→ All set. Starting server…"
node "$SRC/server.js"
