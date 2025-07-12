const db = require("../models");
const User = db.user;

/**
 * Teacher authorization middleware
 * @param {Object} req Express request object
 * @param {Object} res Express response object  
 * @param {Function} next Express next function
 */
const IsTeacher = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role && user.role.toLowerCase() === "teacher") {
      return next();
    }

    return res.status(403).json({ message: "Teacher access required" });

  } catch (err) {
    console.error("IsTeacher error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = IsTeacher;
