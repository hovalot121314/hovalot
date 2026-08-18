const mongoose = require("mongoose");

const businessSettingsSchema = new mongoose.Schema({
  vapidPublicKey: { type: String, default: '', select: false },
  vapidPrivateKey: { type: String, default: '', select: false }
});

module.exports = mongoose.model("BusinessSettings", businessSettingsSchema);
