const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  email: String,
  subject: String,
  prompt: String,
  errorMessage: String,
  stack: String,
  details: Object,
  source: { type: String, default: "gemini" }
});

module.exports = mongoose.model("ErrorLog", errorLogSchema);
