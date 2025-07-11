require("dotenv").config();
const axios = require("axios");
const Suggestion = require("../models/suggestion.model");

/**
 * Search YouTube for videos related to query
 * @param {string} query - Search query
 * @returns {Array} Array of video objects with title, url, type
 */
const YoutubeSearch = async (query) => {
  const { GEMINI_API_KEY } = process.env;
  
  const fallbackVideos = [
    {
      title: `YouTube: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      type: "video",
    },
    {
      title: `YouTube: ${query} Tutorial`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`,
      type: "video",
    },
    {
      title: `YouTube: ${query} Explained`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' explained')}`,
      type: "video",
    }
  ];

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here' || !query?.trim()) {
    return fallbackVideos;
  }

  try {
    const cleanQuery = query.trim().substring(0, 200);
    const { data } = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        type: "video",
        maxResults: 3,
        q: cleanQuery,
        key: GEMINI_API_KEY,
        safeSearch: 'moderate'
      },
      timeout: 10000
    });

    return (data.items || []).map((video) => ({
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      type: "video",
    }));
  } catch (error) {
    return fallbackVideos;
  }
};

/**
 * Search web using Google Custom Search API
 * @param {string} query - Search query
 * @returns {Array} Array of article objects with title, url, snippet, type
 */
const WebSearch = async (query) => {
  const { GEMINI_API_KEY, GOOGLE_CSE_ID } = process.env;
  
  const fallbackArticles = [
    {
      title: `Google: ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Search Google for "${query}"`,
      type: "article",
    },
    {
      title: `Wikipedia: ${query}`,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      snippet: `Wikipedia articles about ${query}`,
      type: "article",
    },
    {
      title: `GeeksforGeeks: ${query}`,
      url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(query)}`,
      snippet: `Programming tutorials and examples for ${query}`,
      type: "article",
    }
  ];

  if (!GEMINI_API_KEY || !GOOGLE_CSE_ID || GOOGLE_CSE_ID === 'your_api_key_here' || !query?.trim()) {
    return fallbackArticles;
  }

  try {
    const cleanQuery = query.trim().substring(0, 200);
    const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        q: cleanQuery,
        cx: GOOGLE_CSE_ID,
        num: 3,
        key: GEMINI_API_KEY,
        safe: 'active'
      },
      timeout: 10000
    });

    return (data.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      type: "article",
    }));
  } catch (error) {
    return fallbackArticles;
  }
};

/**
 * Search for learning suggestions based on subject and topic
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.SearchSuggestions = async (req, res) => {
  const userEmail = req.userEmail;
  const { subject, topic } = req.body;

  if (!userEmail || !subject?.trim() || !topic?.trim()) {
    const missing = [];
    if (!userEmail) missing.push("authentication");
    if (!subject?.trim()) missing.push("subject");
    if (!topic?.trim()) missing.push("topic");
    return res.status(400).json({ 
      message: `Missing or invalid: ${missing.join(", ")}` 
    });
  }

  const { GEMINI_API_KEY, GOOGLE_CSE_ID } = process.env;
  
  if (!GEMINI_API_KEY || !GOOGLE_CSE_ID || GOOGLE_CSE_ID === 'your_custom_search_engine_id_here') {
    const basicSuggestion = await Suggestion.create({
      email: userEmail,
      subject: subject.trim(),
      topic: topic.trim(),
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
    const searchQuery = `${subject.trim()} ${topic.trim()}`;
    const [videos, articles] = await Promise.all([
      YoutubeSearch(searchQuery),
      WebSearch(searchQuery),
    ]);

    const finalVideos = videos.length > 0 ? videos : [
      {
        title: `YouTube: Learn about ${topic} in ${subject}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
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
        url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
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

    const savedSuggestion = await Suggestion.create({
      email: userEmail,
      subject: subject.trim(),
      topic: topic.trim(),
      videos: finalVideos,
      articles: finalArticles,
    });

    res.status(200).json(savedSuggestion);
  } catch (err) {
    res.status(500).json({ 
      message: "Failed to generate suggestions. Please try again later." 
    });
  }
};

/**
 * Get all suggestions for the logged in user
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
exports.GetUserSuggestions = async (req, res) => {
  const userEmail = req.userEmail;

  if (!userEmail) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const suggestions = await Suggestion.find({ email: userEmail }).sort({ createdAt: -1 });
    
    const groupedBySubject = {};
    suggestions.forEach((suggestion) => {
      if (!groupedBySubject[suggestion.subject]) {
        groupedBySubject[suggestion.subject] = [];
      }
      groupedBySubject[suggestion.subject].push({
        topic: suggestion.topic,
        videos: suggestion.videos,
        articles: suggestion.articles,
        createdAt: suggestion.createdAt,
      });
    });

    const result = Object.entries(groupedBySubject).map(([subject, suggestions]) => ({
      subject,
      suggestions,
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch suggestions" });
  }
};
