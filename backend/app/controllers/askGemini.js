// controllers/askGemini.js
const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("[ENV ERROR] GEMINI_API_KEY is not set.");
  throw new Error("GEMINI_API_KEY is not set.");
}

const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
  };

  try {
    const response = await axios.post(endpoint, body, {
      headers: { "Content-Type": "application/json" },
    });

    const data = response.data;

    if (data?.candidates?.[0]?.content?.parts?.length) {
      return data.candidates[0].content.parts.map(p => p.text || "").join("");
    }

    const err = data?.error?.message || "Unknown response format from Gemini";
    throw new Error(err);
  } catch (err) {
    console.error("[Gemini API ERROR]", err.message);
    throw err;
  }
};

module.exports = askGemini;
