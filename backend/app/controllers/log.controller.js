const UserLog = require('../models/log.model');

exports.addLog = async (req, res) => {
  try {
    const { email, action, message, meta } = req.body;

    const log = new UserLog({ email, action, message, meta });
    await log.save();

    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log event', error });
  }
};

exports.getLogsByUser = async (req, res) => {
  try {
    const { email } = req.params;
    const logs = await UserLog.find({ email }).sort({ timestamp: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs', error });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await UserLog.find({}).sort({ timestamp: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching all logs', error });
  }
};

exports.getLogsByEmailQuery = async (req, res) => {
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
