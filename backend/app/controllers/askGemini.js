// controllers/askGemini.js
const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("[ENV ERROR] GEMINI_API_KEY is not set.");
  throw new Error("GEMINI_API_KEY is not set.");
}

// Use the latest model version (gemini-1.5-flash)
const MODEL_NAME = "gemini-1.5-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Calls Gemini API with optional image.
 * @param {string} modelName - Ignored (for compatibility)
 * @param {string} prompt - The user's message or task
 * @param {string|null} mimeType - e.g. "image/png" or null
 * @param {string|null} base64Image - base64 string of image
 * @returns {Promise<string>} - The generated response
 */
const askGemini = async (modelName, prompt, mimeType = null, base64Image = null) => {
  const parts = [];

  if (base64Image && mimeType) {
    parts.push({ inlineData: { data: base64Image, mimeType } });
  }
  if (prompt) {
    parts.push({ text: prompt });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048
    }
  };

  try {
    console.log(`Calling Gemini API (${MODEL_NAME}) with prompt: "${prompt.substring(0, 50)}..."`);
    
    const response = await axios.post(endpoint, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000 // 30 second timeout
    });

    const data = response.data;

    if (data?.candidates?.[0]?.content?.parts?.length) {
      return data.candidates[0].content.parts.map(p => p.text || "").join("");
    }

    const err = data?.error?.message || "Unknown response format from Gemini";
    throw new Error(err);
  } catch (err) {
    // Better error logging with detailed information
    if (err.response?.data?.error) {
      console.error("[Gemini API ERROR]", JSON.stringify(err.response.data.error, null, 2));
    } else {
      console.error("[Gemini API ERROR]", err.message);
    }
    
    // Return a friendly error message instead of throwing
    return `I encountered a technical issue while processing your request. Error: ${err.message || "Unknown error"}`;
  }
};

module.exports = askGemini;
