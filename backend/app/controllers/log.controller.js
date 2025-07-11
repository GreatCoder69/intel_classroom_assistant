const UserLog = require('../models/log.model');

/**
 * Add a new log entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.AddLog = async (req, res) => {
  try {
    const { email, action, message, meta } = req.body;

    const log = new UserLog({ email, action, message, meta });
    await log.save();

    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log event', error });
  }
};

/**
 * Get logs by user email (from params)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.GetLogsByUser = async (req, res) => {
  try {
    const { email } = req.params;
    const logs = await UserLog.find({ email }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs', error });
  }
};

/**
 * Get all logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.GetAllLogs = async (req, res) => {
  try {
    const logs = await UserLog.find({}).sort({ timestamp: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching all logs', error });
  }
};

/**
 * Get logs by user email (from query)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.GetLogsByEmailQuery = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required in query' });
    }

    const logs = await UserLog.find({ email }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs', error });
  }
};
