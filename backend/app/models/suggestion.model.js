const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema({
  title:   String,
  url:     String,
  snippet: String,                 // for web pages
  type:    { type: String, enum: ["video", "article"] }
});

const SuggestionSchema = new mongoose.Schema({
  email:   { type: String, required: true },
  subject: { type: String, required: true },
  topic:   { type: String, required: true },

  videos:   [LinkSchema],          // top‑3 YouTube
  articles: [LinkSchema],          // top‑3 web resources

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Suggestion", SuggestionSchema);
