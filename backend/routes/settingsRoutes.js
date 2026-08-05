const express = require("express");
const router = express.Router();
const BusinessSettings = require("../models/BusinessSettings");
const { protect } = require("../middleware/authMiddleware");

router.get("/", async (req,res)=>{
  const settings = await BusinessSettings.findOne();
  res.json(settings);
});

router.put("/", protect, async (req,res)=>{
  const settings = await BusinessSettings.findOneAndUpdate(
    {},
    { workingHours: req.body.workingHours, dateOverrides: req.body.dateOverrides },
    { new:true }
  );
  res.json(settings);
});

module.exports = router;
