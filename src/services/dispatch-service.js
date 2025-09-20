const express = require('express');
const router = express.Router();

router.get('/', (req,res)=> res.json({ service: "Dispatch Service", status: "ok ✅"}));

module.exports = router;
