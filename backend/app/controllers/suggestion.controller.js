require("dotenv").config();
const axios      = require("axios");
const Suggestion = require("../models/suggestion.model");

/* ───── helper: YouTube top‑3 videos ───── */
const youtubeSearch = async (q) => {
  const { GEMINI_API_KEY } = process.env;
  const url = "https://www.googleapis.com/youtube/v3/search";

  const { data } = await axios.get(url, {
    params: {
      part:       "snippet",
      type:       "video",
      maxResults: 3,
      q,
      key: GEMINI_API_KEY      // 👈 same key
    },
  });

  return (data.items || []).map((v) => ({
    title: v.snippet.title,
    url:   `https://www.youtube.com/watch?v=${v.id.videoId}`,
    type:  "video",
  }));
};

/* ───── helper: Custom Search top‑3 web links ───── */
const webSearch = async (q) => {
  const { GEMINI_API_KEY, GOOGLE_CSE_ID } = process.env;
  const url = "https://www.googleapis.com/customsearch/v1";

  const { data } = await axios.get(url, {
    params: {
      q,
      cx:  GOOGLE_CSE_ID,      // search‑engine ID
      num: 3,
      key: GEMINI_API_KEY      // 👈 same key
    },
  });

  return (data.items || []).map((item) => ({
    title:   item.title,
    url:     item.link,
    snippet: item.snippet,
    type:    "article",
  }));
};

/* ───── controller ───── */
exports.searchSuggestions = async (req, res) => {
  const email   = req.userEmail;            // set by verifyToken middleware
  const subject = req.body.subject?.trim();
  const topic   = req.body.topic?.trim();

  if (!email || !subject || !topic) {
    return res
      .status(400)
      .json({ message: "subject, topic and auth required" });
  }

  try {
    const query = `${subject} ${topic}`;

    const [videos, articles] = await Promise.all([
      youtubeSearch(query),
      webSearch(query),
    ]);

    const saved = await Suggestion.create({
      email,
      subject,
      topic,
      videos,
      articles,
    });

    res.status(200).json(saved);
  } catch (err) {
    console.error("Suggestion search error:", err.message);
    res.status(500).json({ message: "Lookup failed" });
  }
};

/* ───── GET all suggestions for the logged‑in user ───── */
exports.getUserSuggestions = async (req, res) => {
  const email = req.userEmail;               // set by verifyToken

  if (!email) {
    return res.status(401).json({ message: "Auth required" });
  }

  try {
    // grab everything this user has saved, newest first
    const docs = await Suggestion.find({ email }).sort({ createdAt: -1 });

    // group by subject → [{ subject, suggestions:[…] }]
    const bySubject = {};
    docs.forEach((d) => {
      if (!bySubject[d.subject]) bySubject[d.subject] = [];
      bySubject[d.subject].push({
        topic    : d.topic,
        videos   : d.videos,
        articles : d.articles,
        createdAt: d.createdAt,
      });
    });

    const payload = Object.entries(bySubject).map(([subject, suggestions]) => ({
      subject,
      suggestions,
    }));

    res.status(200).json(payload);
  } catch (err) {
    console.error("getUserSuggestions error:", err.message);
    res.status(500).json({ message: "Could not fetch suggestions" });
  }
};
