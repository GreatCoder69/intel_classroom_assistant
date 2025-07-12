const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const LogEvent = require("../utils/logEvent");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

/**
 * User registration
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.SignUp = async (req, res) => {
  try {
    const newUser = new User({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email.toLowerCase(),
      password: bcrypt.hashSync(req.body.password, 8),
      profileimg: "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg",
      role: (req.body.role || "student").toLowerCase()
    });

    await newUser.save();

    await LogEvent({
      email: newUser.email,
      action: "signup",
      message: "User registered"
    });

    res.status(201).send({ message: "User was registered successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message || "Registration failed." });
  }
};

/**
 * User authentication
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.SignIn = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).send({ message: "User not found." });
    if (!user.isActive) return res.status(403).send({ message: "Account is disabled by admin." });

    const isValidPassword = bcrypt.compareSync(req.body.password, user.password);
    if (!isValidPassword) {
      return res.status(401).send({ accessToken: null, message: "Invalid Password!" });
    }

    const accessToken = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    }, config.secret, { expiresIn: 86400 });

    await LogEvent({
      email: user.email,
      action: "login",
      message: "User logged in"
    });

    res.status(200).send({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileimg: user.profileimg,
      role: user.role,
      accessToken: accessToken
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get current user information
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.GetMe = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileimg: user.profileimg,
      role: user.role
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update user profile
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.UpdateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, password } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (password) updateData.password = bcrypt.hashSync(password, 8);

    if (req.file) {
      const profileImageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      updateData.profileimg = profileImageUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    
    if (!updatedUser) {
      return res.status(404).send({ message: "User not found." });
    }

    await LogEvent({
      email: updatedUser.email,
      action: "edit_profile",
      message: "Profile updated"
    });

    res.status(200).send({
      message: "Profile updated successfully!",
      profileimg: updatedUser.profileimg
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * User logout
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.SignOut = async (req, res) => {
  try {
    const userEmail = req.userEmail;
    
    if (userEmail) {
      await LogEvent({
        email: userEmail,
        action: "logout",
        message: "User logged out"
      });
    }

    res.status(200).send({ message: "You've been signed out!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
