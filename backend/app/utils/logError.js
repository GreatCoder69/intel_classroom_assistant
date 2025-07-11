const ErrorLog = require("../models/errorlog.model");

/**
 * Log LLM errors to database
 * @param {Object} params - Error logging parameters
 * @param {string} params.email - User email
 * @param {string} params.subject - Subject context
 * @param {string} params.prompt - User prompt
 * @param {Error} params.error - Error object
 */
const LogLLMError = async ({ email, subject, prompt, error }) => {
  try {
    await ErrorLog.create({
      email,
      subject,
      prompt,
      errorMessage: error.message,
      stack: error.stack,
      details: error.response?.data || {},
    });
  } catch (err) {
    console.error("Error while logging Gemini error:", err);
  }
};

module.exports = LogLLMError;
