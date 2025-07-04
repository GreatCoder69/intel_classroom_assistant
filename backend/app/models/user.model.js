const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
    new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    profileimg: String,
    role: { type: String, default: "student" },
    isAdmin: { type: Boolean, default: false },
    isActive: {
      type: Boolean,
      default: true,
    },
  })
);

module.exports = User;
