const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const Chat = require('../models/chat.model'); 
const ErrorLog = require("../models/errorlog.model");

exports.getErrorLogs = async (req, res) => {
  try {
    const logs = await ErrorLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json(logs);
  } catch (err) {
    console.error("Failed to fetch error logs:", err);
    res.status(500).send({ message: "Could not retrieve error logs" });
  }
};

exports.toggleUserStatus = async (req, res) => {
  const { email, isActive } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).send({ message: "User not found." });

  user.isActive = isActive;
  await user.save();

  res.send({ message: `User ${isActive ? "enabled" : "disabled"}.` });
};

exports.getAllUsersWithChats = async (req, res) => {
  try {
    const chats = await Chat.find({}).sort({ lastUpdated: -1 });
    const userIds = chats.map(c => c.email);
    const uniqueEmails = [...new Set(userIds)];

    const usersWithChats = await User.find({ email: { $in: uniqueEmails } });

    const result = await Promise.all(usersWithChats.map(async user => {
      const userChats = chats.filter(chat => chat.email === user.email);
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileimg: user.profileimg,
        isActive: user.isActive,
        chats: userChats.map(c => ({
          subject: c._id,
          history: c.chat.map(entry => ({
            question: entry.question,
            answer: entry.answer,
            timestamp: entry.timestamp,
            imageUrl: entry.imageUrl || null,
            _id: entry._id,
            downloadCount: entry.downloadCount || 0
          }))
        }))
      };
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("Admin chat fetch error:", err);
    res.status(500).json({ message: "Error fetching user chats" });
  }
};


exports.getAdminSummary = async (req, res) => {
  try {
    const users = await User.find({});
    const chats = await Chat.find({});
    const totalUsers = users.length;

    let totalChats = 0;
    let chatsWithImages = 0;
    let chatsWithPDFs = 0;
    let chatsWithoutFiles = 0;

    chats.forEach(chat => {
      chat.chat.forEach(entry => {
        totalChats++;

        const imageUrl = entry.imageUrl;

        if (!imageUrl) {
          chatsWithoutFiles++;
        } else if (imageUrl.toLowerCase().endsWith('.pdf')) {
          chatsWithPDFs++;
        } else {
          chatsWithImages++;
        }
      });
    });

    res.json({
      totalUsers,
      totalChats,
      chatsWithoutFiles,
      chatsWithImages,
      chatsWithPDFs
    });

  } catch (err) {
    console.error('Error in getAdminSummary:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found." });

    res.status(200).send({
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileimg: user.profileimg,
      isActive: user.isActive,
      id: user._id,
    });
  } catch (err) {
    console.error("Admin GetUser error:", err);
    res.status(500).send({ message: "Error retrieving user profile." });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const { email, name, phone, password } = req.body;
    const file = req.file;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) user.password = bcrypt.hashSync(password, 8);

    if (file) {
      const oldUrl = user.profileimg || "";
      const isDefault = oldUrl.includes("shutterstock.com");

      // Only delete old file if it's a custom uploaded file
      if (!isDefault && oldUrl.includes("/uploads/")) {
        const filename = oldUrl.split("/uploads/")[1];
        const filePath = path.join(__dirname, "..", "uploads", filename);

        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

          } else {
            console.warn("⚠️ File not found for deletion:", filePath);
          }
        } catch (err) {
          console.error("❌ Failed to delete old image:", err);
        }
      }

      user.profileimg = `http://localhost:8080/uploads/${file.filename}`;
    }

    await user.save();

    res.status(200).send({
      message: "User updated successfully.",
      profileimg: user.profileimg,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send({ message: "Error updating user." });
  }
};

exports.toggleChatVisibility = async (req, res) => {
  const { email, subject } = req.body;

  if (!email || !subject) {
    return res.status(400).json({ message: "Email and subject are required" });
  }

  try {
    const chat = await Chat.findOne({ _id: subject, email });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    chat.isPublic = !chat.isPublic;
    await chat.save();

    res.status(200).json({
      message: `Chat visibility toggled to ${chat.isPublic ? "public" : "private"}`,
      isPublic: chat.isPublic
    });
  } catch (err) {
    console.error("Toggle public error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
