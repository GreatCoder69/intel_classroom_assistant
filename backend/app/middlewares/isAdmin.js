const db = require("../models");
const User = db.user;

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId); // req.userId should be set by verifyToken middleware

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isAdmin === true) {
      next(); // ✅ user is admin, proceed
    } else {
      return res.status(403).json({ message: "Require Admin Access!" });
    }
  } catch (err) {
    console.error("isAdmin error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = isAdmin;
