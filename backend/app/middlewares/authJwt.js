const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models/index.js");
const User = db.user;

verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }

    try {
      const user = await User.findById(decoded.id).exec();
      if (!user) {
        return res.status(404).send({ message: "User not found!" });
      }

      req.userId = user._id;
      req.userEmail = user.email; // ✅ attach email
      next();
    } catch (dbErr) {
      return res.status(500).send({ message: "Error verifying user" });
    }
  });
};

const authJwt = {
  verifyToken,
};

module.exports = authJwt;
