// middlewares/isTeacher.js
const db = require("../models");
const User = db.user;

/**
 * Allows the request to continue only if the authenticated user
 * has role === "teacher".
 * Assumes `verifyToken` middleware has already set req.userId.
 */
const isTeacher = async (req, res, next) => {
  try {
    // 1️⃣  Fetch the user by ID
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣  Check the role
    if (user.role && user.role.toLowerCase() === "teacher") {
      return next();                         // ✅ authorized
    }

    // 3️⃣  Not a teacher → reject
    return res.status(403).json({ message: "Teacher access required" });

  } catch (err) {
    console.error("isTeacher error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = isTeacher;
