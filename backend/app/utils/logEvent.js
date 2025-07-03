// utils/logEvent.js
const UserLog = require("../models/log.model");
const isAdmin = require("../middlewares/isAdmin");

const logEvent = async ({ email, action, message, meta = {} }) => {
  try {
    await new UserLog({ email, action, message, meta }).save();
  } catch (err) {
    console.error("Failed to log event:", err.message);
  }
};

module.exports = logEvent;
