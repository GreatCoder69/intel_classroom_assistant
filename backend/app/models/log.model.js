const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  action: { type: String, required: true, enum: ['login', 'logout', 'chat', 'signup', 'edit_profile','create_chat'] },
  message: { type: String }, // optional description
  timestamp: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed }, // optional, can store question, answer, IP, etc.
});

module.exports = mongoose.model('UserLog', userLogSchema);
