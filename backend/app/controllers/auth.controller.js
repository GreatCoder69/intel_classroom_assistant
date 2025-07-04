const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const logEvent = require("../utils/logEvent");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// ── SIGN‑UP ───────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const user = new User({
      name      : req.body.name,
      phone     : req.body.phone,
      email     : req.body.email.toLowerCase(),
      password  : bcrypt.hashSync(req.body.password, 8),
      profileimg: "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg",
      role      : (req.body.role || "student").toLowerCase()   // 👈 new line
    });

    await user.save();

    await logEvent({
      email  : user.email,
      action : "signup",
      message: "User registered"
    });

    res.status(201).send({ message: "User was registered successfully!" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send({ message: err.message || "Registration failed." });
  }
};


// ── SIGN‑IN ───────────────────────────────────────────
exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user)  return res.status(404).send({ message: "User not found." });
    if (!user.isActive) return res.status(403).send({ message: "Account is disabled by admin." });

    const valid = bcrypt.compareSync(req.body.password, user.password);
    if (!valid) {
      return res.status(401).send({ accessToken: null, message: "Invalid Password!" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },   // 👈 include role in token if you like
      config.secret,
      { algorithm: "HS256", allowInsecureKeySizes: true, expiresIn: 86400 }
    );

    await logEvent({
      email  : user.email,
      action : "login",
      message: "User logged in",
      meta   : { ip: req.ip }
    });

    res.status(200).send({
      accessToken: token,
      user: {
        id      : user._id,
        name    : user.name,
        email   : user.email,
        role    : user.role,     // 👈 return role
        isAdmin : user.isAdmin,
        isActive: user.isActive
      }
    });

  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).send({ message: "Internal server error." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { email, name, phone, password } = req.body;
    const file = req.file;

    if (req.userEmail !== email) {
      return res.status(403).send({ message: "You can only update your own profile." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const updates = {};
    if (name) { user.name = name; updates.name = name; }
    if (phone) { user.phone = phone; updates.phone = phone; }
    if (password) {
      user.password = bcrypt.hashSync(password, 8);
      updates.password = '***';
    }

    if (file) {
      const oldUrl = user.profileimg;
      const isDefault = oldUrl.includes("shutterstock.com");

      if (!isDefault && oldUrl.includes("/uploads/")) {
        const filename = oldUrl.split("/uploads/")[1];
        const filePath = path.join(__dirname, "..", "uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error("❌ Failed to delete old image:", err);
            else console.log("🗑️ Old image deleted:", filename);
          });
        } else {
          console.warn("⚠️ File not found for deletion:", filePath);
        }
      }

      const newImg = `http://localhost:8080/uploads/${file.filename}`;
      user.profileimg = newImg;
      updates.profileimg = newImg;
    }

    await user.save();

    await logEvent({
      email,
      action: "edit_profile",
      message: "User updated profile",
      meta: updates
    });

    res.status(200).send({
      message: "User updated successfully.",
      profileimg: user.profileimg,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send({ message: "Error updating user." });
  }
};


// in controllers/auth.controller.js
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).send({ message: "User not found." });

    res.status(200).send({
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileimg: user.profileimg 
    });
  } catch (err) {
    res.status(500).send({ message: "Error retrieving profile." });
  }
};


