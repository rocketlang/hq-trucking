const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Billing Service", status: "ok ✅"}));

module.exports = router;
