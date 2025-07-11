const express = require("express");
const router = express.Router();
const suggestionCtrl = require("../controllers/suggestion.controller");
const { verifyToken } = require("../middlewares/authJwt");

router.post("/suggestions", verifyToken, suggestionCtrl.SearchSuggestions);
router.get("/suggestions", verifyToken, suggestionCtrl.GetUserSuggestions);

module.exports = (app) => app.use("/api", router);
