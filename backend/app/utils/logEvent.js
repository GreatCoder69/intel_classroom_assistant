const UserLog = require("../models/log.model");
const isAdmin = require("../middlewares/isAdmin");

/**
 * Log user events to database
 * @param {Object} params - Event logging parameters
 * @param {string} params.email - User email
 * @param {string} params.action - Action performed
 * @param {string} params.message - Event message
 * @param {Object} params.meta - Additional metadata
 */
const LogEvent = async ({ email, action, message, meta = {} }) => {
  try {
    await new UserLog({ email, action, message, meta }).save();
  } catch (err) {
    console.error("Failed to log event:", err.message);
  }
};

module.exports = LogEvent;
