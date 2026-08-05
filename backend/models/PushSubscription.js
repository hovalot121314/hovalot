const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
