const mongoose = require("mongoose");

const breakSchema = {
  start: String,
  end: String
};

const daySchema = {
  start: String,
  end: String,
  breaks: [breakSchema],   // ✅ מערך הפסקות
  enabled: Boolean
};

const businessSettingsSchema = new mongoose.Schema({
  vapidPublicKey: { type: String, default: '', select: false },
  vapidPrivateKey: { type: String, default: '', select: false },
  workingHours: {
    sunday: daySchema,
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema
  },
  dateOverrides: [{
    date: String,
    enabled: Boolean,
    start: String,
    end: String,
    breaks: [breakSchema]
  }]
});

module.exports = mongoose.model("BusinessSettings", businessSettingsSchema);
