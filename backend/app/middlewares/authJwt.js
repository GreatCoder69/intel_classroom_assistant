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

    req.userId = decoded.id;
    req.userEmail = decoded.email; // Make sure email is set here
    req.userRole = decoded.role;   // And role if available

    next();
  });
};

isTeacher = (req, res, next) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).send({ message: "Require Teacher Role!" });
  }
  next();
};

const authJwt = {
  verifyToken,
  isTeacher
};

module.exports = authJwt;
