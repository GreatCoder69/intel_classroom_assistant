const { verifyToken } = require("../middlewares/authJwt");
const controller = require("../controllers/log.controller");
const isAdmin = require("../middlewares/isAdmin");

module.exports = (app) => {
  app.post("/api/log", verifyToken, controller.AddLog);
  app.get("/api/admin/logs", [verifyToken, isAdmin], controller.GetAllLogs);
  app.get("/api/logs/:email", [verifyToken, isAdmin], controller.GetLogsByUser);
  app.get("/api/admin/user-logs", [verifyToken, isAdmin], controller.GetLogsByEmailQuery);
};
