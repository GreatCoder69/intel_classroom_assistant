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
