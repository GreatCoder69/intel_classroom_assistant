const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");

// Middleware to verify token and set user info in request
const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    req.userEmail = decoded.email; // Make sure email is included in the token
    req.userRole = decoded.role;   // And role if available
    next();
  });
};

module.exports = { verifyToken };