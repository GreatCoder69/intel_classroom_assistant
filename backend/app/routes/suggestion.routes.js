const express         = require("express");
const { verifyToken } = require("../middlewares/authJwt");
const suggCtrl        = require("../controllers/suggestion.controller");

const router = express.Router();

router.post("/suggestions/search", verifyToken, suggCtrl.searchSuggestions);

module.exports = (app) => {
  app.use("/api", router);
};
