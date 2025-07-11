require("dotenv").config();
const axios      = require("axios");
const Suggestion = require("../models/suggestion.model");

/* ───── helper: YouTube top‑3 videos ───── */
const youtubeSearch = async (q) => {
  const { GEMINI_API_KEY } = process.env;
  
  // Check if API key is properly configured
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
    console.log("YouTube search: API key not configured properly, returning fallback links");
    return [
      {
        title: `YouTube: ${q}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        type: "video",
      },
      {
        title: `YouTube: ${q} Tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' tutorial')}`,
        type: "video",
      },
      {
        title: `YouTube: ${q} Explained`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' explained')}`,
        type: "video",
      }
    ];
  }

  // Validate and clean the query
  if (!q || q.trim().length === 0) {
    console.error("YouTube search: Empty query provided");
    return [];
  }

  try {
    const url = "https://www.googleapis.com/youtube/v3/search";
    const cleanQuery = q.trim().substring(0, 200); // Limit query length

    console.log(`YouTube search attempting with query: "${cleanQuery}"`);

    const { data } = await axios.get(url, {
      params: {
        part: "snippet",
        type: "video",
        maxResults: 3,
        q: cleanQuery,
        key: GEMINI_API_KEY,
        safeSearch: 'moderate' // Add safe search
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`YouTube search successful, found ${data.items?.length || 0} results`);

    return (data.items || []).map((v) => ({
      title: v.snippet.title,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      type: "video",
    }));
  } catch (error) {
    console.error("YouTube search error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      query: q
    });
    
    // Return 3 fallback search links instead of empty array
    return [
      {
        title: `YouTube: ${q}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        type: "video",
      },
      {
        title: `YouTube: ${q} Tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' tutorial')}`,
        type: "video",
      },
      {
        title: `YouTube: ${q} Explained`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' explained')}`,
        type: "video",
      }
    ];
  }
};

/* ───── helper: Custom Search top‑3 web links ───── */
const webSearch = async (q) => {
  const { GEMINI_API_KEY, GOOGLE_CSE_ID } = process.env;
  
  // Check if API keys are properly configured
  if (!GEMINI_API_KEY || !GOOGLE_CSE_ID || GOOGLE_CSE_ID === 'your_api_key_here') {
    console.log("Web search: API keys not configured properly, returning fallback links");
    return [
      {
        title: `Google: ${q}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        snippet: `Search Google for "${q}"`,
        type: "article",
      },
      {
        title: `Wikipedia: ${q}`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
        snippet: `Wikipedia articles about ${q}`,
        type: "article",
      },
      {
        title: `GeeksforGeeks: ${q}`,
        url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(q)}`,
        snippet: `Programming tutorials and examples for ${q}`,
        type: "article",
      }
    ];
  }

  // Validate and clean the query
  if (!q || q.trim().length === 0) {
    console.error("Web search: Empty query provided");
    return [];
  }

  try {
    const url = "https://www.googleapis.com/customsearch/v1";
    const cleanQuery = q.trim().substring(0, 200); // Limit query length

    console.log(`Web search attempting with query: "${cleanQuery}"`);

    const { data } = await axios.get(url, {
      params: {
        q: cleanQuery,
        cx: GOOGLE_CSE_ID,
        num: 3,
        key: GEMINI_API_KEY,
        safe: 'active' // Add safe search
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`Web search successful, found ${data.items?.length || 0} results`);

    return (data.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      type: "article",
    }));
  } catch (error) {
    console.error("Web search error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      query: q
    });
    
    // Return 3 fallback search links instead of empty array
    return [
      {
        title: `Google: ${q}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        snippet: `Search Google for "${q}"`,
        type: "article",
      },
      {
        title: `Wikipedia: ${q}`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
        snippet: `Wikipedia articles about ${q}`,
        type: "article",
      },
      {
        title: `GeeksforGeeks: ${q}`,
        url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(q)}`,
        snippet: `Programming tutorials and examples for ${q}`,
        type: "article",
      }
    ];
  }
};

/* ───── controller ───── */
exports.searchSuggestions = async (req, res) => {
  const email   = req.userEmail;            // set by verifyToken middleware
  const subject = req.body.subject?.trim();
  const topic   = req.body.topic?.trim();

  // Log received values for debugging
  console.log("Suggestion search request:", { email, subject, topic });

  if (!email || !subject || !topic) {
    let missing = [];
    if (!email) missing.push("authentication");
    if (!subject) missing.push("subject");
    if (!topic) missing.push("topic");
    return res
      .status(400)
      .json({ message: `Missing or invalid: ${missing.join(", ")}` });
  }

  // Check for required API keys and provide fallback
  const { GEMINI_API_KEY, GOOGLE_CSE_ID } = process.env;
  
  // Log what we actually have
  console.log("API Keys check:", { 
    hasGeminiKey: !!GEMINI_API_KEY, 
    geminiKey: GEMINI_API_KEY?.substring(0, 10) + '...', 
    hasCSEId: !!GOOGLE_CSE_ID, 
    cseId: GOOGLE_CSE_ID 
  });
  
  if (!GEMINI_API_KEY || !GOOGLE_CSE_ID || GOOGLE_CSE_ID === 'your_custom_search_engine_id_here') {
    console.warn("API keys not configured properly. Returning basic search suggestions.");
    
    // Create a basic suggestion with 3 videos and 3 articles
    const basicSuggestion = await Suggestion.create({
      email,
      subject,
      topic,
      videos: [
        {
          title: `YouTube: Learn about ${topic} in ${subject}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' ' + topic)}`,
          type: "video"
        },
        {
          title: `YouTube: ${topic} Tutorial`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' tutorial')}`,
          type: "video"
        },
        {
          title: `YouTube: ${topic} Explained`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' explained')}`,
          type: "video"
        }
      ],
      articles: [
        {
          title: `Google: ${topic} Resources in ${subject}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(subject + ' ' + topic)}`,
          snippet: `Search Google for ${topic} in ${subject}`,
          type: "article"
        }, 
        {
          title: `Wikipedia: ${topic}`,
          url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
          snippet: `Wikipedia articles about ${topic}`,
          type: "article"
        },
        {
          title: `GeeksforGeeks: ${topic}`,
          url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(topic)}`,
          snippet: `Programming tutorials and examples for ${topic}`,
          type: "article"
        }
      ]
    });

    return res.status(200).json(basicSuggestion);
  }

  try {
    const query = `${subject} ${topic}`;

    const [videos, articles] = await Promise.all([
      youtubeSearch(query),  // Don't catch errors here - let the helper handle them
      webSearch(query),      // Don't catch errors here - let the helper handle them
    ]);

    // Ensure we always have at least some results
    const finalVideos = videos.length > 0 ? videos : [
      {
        title: `YouTube: Learn about ${topic} in ${subject}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        type: "video"
      },
      {
        title: `YouTube: ${topic} Tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' tutorial')}`,
        type: "video"
      },
      {
        title: `YouTube: ${subject} Basics`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' basics')}`,
        type: "video"
      }
    ];

    const finalArticles = articles.length > 0 ? articles : [
      {
        title: `Google: ${topic} in ${subject}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Search Google for ${topic} in ${subject}`,
        type: "article"
      },
      {
        title: `Wikipedia: ${topic}`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
        snippet: `Wikipedia articles about ${topic}`,
        type: "article"
      },
      {
        title: `GeeksforGeeks: ${topic}`,
        url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(topic)}`,
        snippet: `Programming tutorials and examples for ${topic}`,
        type: "article"
      }
    ];

    const saved = await Suggestion.create({
      email,
      subject,
      topic,
      videos: finalVideos,
      articles: finalArticles,
    });

    res.status(200).json(saved);
  } catch (err) {
    console.error("Suggestion search error:", err.message);
    res.status(500).json({ 
      message: "Failed to generate suggestions. Please try again later." 
    });
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
