require('dotenv').config(); // Load .env

module.exports = {
  secret: process.env.JWT_SECRET || "fallback-secret-key"
};
