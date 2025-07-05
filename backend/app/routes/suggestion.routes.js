const express            = require("express");
const router             = express.Router();
const suggestionCtrl     = require("../controllers/suggestion.controller");
const { verifyToken }    = require("../middlewares/authJwt");

/* existing POST /suggestions */
router.post("/suggestions", verifyToken, suggestionCtrl.searchSuggestions);

/* NEW: GET /suggestions  (all for the user) */
router.get("/suggestions", verifyToken, suggestionCtrl.getUserSuggestions);

module.exports = (app) => app.use("/api", router);
