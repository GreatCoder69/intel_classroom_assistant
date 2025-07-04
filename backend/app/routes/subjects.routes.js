const { authJwt } = require("../middlewares");
const controller = require("../controllers/subjects.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all subjects for authenticated users
  app.get("/api/subjects", [authJwt.verifyToken], controller.getSubjects);
  
  // Get subjects specific to a user (student progress, teacher assignments)
  app.get("/api/subjects/user", [authJwt.verifyToken], controller.getUserSubjects);
  
  // Teacher-only routes
  app.post("/api/subjects", [authJwt.verifyToken, authJwt.isTeacher], controller.createSubject);
  app.put("/api/subjects/:id", [authJwt.verifyToken, authJwt.isTeacher], controller.updateSubject);
  app.delete("/api/subjects/:id", [authJwt.verifyToken, authJwt.isTeacher], controller.deleteSubject);
  
  // Update student progress
  app.put("/api/subjects/:id/progress", [authJwt.verifyToken], controller.updateProgress);
};
