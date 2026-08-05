const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  title: { type: String, required: true, maxlength: 100 },
  body: { type: String, required: true, maxlength: 800 },
  tag: { type: String, required: true },
  url: { type: String, default: './dashboard.html' },
  readAt: { type: Date, default: null, index: true }
}, { timestamps: true });

messageSchema.index({ admin: 1, tag: 1 }, { unique: true });

module.exports = mongoose.model('Message', messageSchema);
