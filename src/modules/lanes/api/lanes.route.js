const express = require('express'); const router = express.Router();
router.get('/', async (req,res)=> res.json({ service:"lanes", status:"ok" }));
module.exports = router;
