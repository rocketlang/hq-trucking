l#!/bin/bash
set -euo pipefail

ROOT="$HOME/hq-trucking"
SRC="$ROOT/src"
SERVICES="$SRC/services"
INFRA="$SRC/infra"

mkdir -p "$SERVICES" "$INFRA"

# --- server.js ---
cat <<'EOF' > "$SRC/server.js"
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rate = require('./services/rate-service');
const dispatch = require('./services/dispatch-service');
const tracking = require('./services/tracking-service');
const billing = require('./services/billing-service');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());

app.get('/', (req,res)=> res.json({
  message: "🚛 HQ Trucking Intelligence Platform",
  status: "production ready ✅"
}));

// Hook services
app.use('/rate', rate);
app.use('/dispatch', dispatch);
app.use('/tracking', tracking);
app.use('/billing', billing);

app.listen(PORT, ()=> {
  console.clear();
  console.log("🚛 HQ TRUCKING DATABASE STARTED!");
  console.log("🌐 Server: http://localhost:"+PORT);
});
EOF

# --- rate-service.js ---
cat <<'EOF' > "$SERVICES/rate-service.js"
const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Rate Service", status: "ok ✅"}));

module.exports = router;
EOF

# --- dispatch-service.js ---
cat <<'EOF' > "$SERVICES/dispatch-service.js"
const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Dispatch Service", status: "ok ✅"}));

module.exports = router;
EOF

# --- tracking-service.js ---
cat <<'EOF' > "$SERVICES/tracking-service.js"
const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Tracking Service", status: "ok ✅"}));

module.exports = router;
EOF

# --- billing-service.js ---
cat <<'EOF' > "$SERVICES/billing-service.js"
const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Billing Service", status: "ok ✅"}));

module.exports = router;
EOF

# --- db-file.js ---
cat <<'EOF' > "$INFRA/db-file.js"
module.exports = {
  tablesDir: "$ROOT/data/tables",
  insert: (table, row)=> { console.log("insert row into", table, row); },
};
EOF

echo "✅ All files scaffolded!"
echo "👉 Next steps:"
echo "   cd $ROOT"
echo "   npm init -y"
echo "   npm install express cors compression"
echo "   node src/server.js"
