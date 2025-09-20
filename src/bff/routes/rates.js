const express = require("express");
const router = express.Router();
const { get } = require("../../services/rates");

router.get("/", async (req,res)=>{ res.json(await get()); });

module.exports = router;
