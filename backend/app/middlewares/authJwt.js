const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models/index.js");
const User = db.user;

/**
 * Token verification middleware
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const VerifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }

    try {
      req.userId = decoded.id;
      
      if (decoded.email && decoded.role) {
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
      } else {
        const user = await User.findById(decoded.id);
        if (!user) {
          return res.status(401).send({ message: "User not found!" });
        }
        req.userEmail = user.email;
        req.userRole = user.role;
        next();
      }
    } catch (error) {
      return res.status(500).send({ message: "Internal server error" });
    }
  });
};

/**
 * Teacher role verification middleware
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next function
 */
const IsTeacher = (req, res, next) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).send({ message: "Require Teacher Role!" });
  }
  next();
};

const authJwt = {
  verifyToken: VerifyToken,
  isTeacher: IsTeacher
};

module.exports = authJwt;
