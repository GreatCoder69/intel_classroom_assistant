const { verifyToken } = require("../middlewares/authJwt");
const controller = require("../controllers/log.controller");
const isAdmin = require("../middlewares/isAdmin");

module.exports = (app) => {
  // 👉 Add a new log entry (requires authentication)
  app.post("/api/log", verifyToken, controller.addLog);

  // 👉 Get all logs (requires authentication)
  app.get("/api/admin/logs", [verifyToken, isAdmin] , controller.getAllLogs);

  // 👉 Get logs by specific user (optional: can add admin protection later)
  app.get("/api/logs/:email", [verifyToken, isAdmin], controller.getLogsByUser);

  app.get("/api/admin/user-logs", [verifyToken, isAdmin], controller.getLogsByEmailQuery);
};
