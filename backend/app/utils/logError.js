const ErrorLog = require("../models/errorlog.model");

const logLLMError = async ({ email, subject, prompt, error }) => {
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

module.exports = logLLMError;
