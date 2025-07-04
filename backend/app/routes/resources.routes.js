const { authJwt } = require("../middlewares");
const controller = require("../controllers/resources.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Get all resources for a subject
  app.get("/api/subjects/:subjectId/resources", [authJwt.verifyToken], controller.getResourcesBySubject);
  
  // Get a specific resource
  app.get("/api/resources/:id", [authJwt.verifyToken], controller.getResource);
  
  // Download a resource file
  app.get("/api/resources/:id/download", [authJwt.verifyToken], controller.downloadResource);
  
  // Teacher-only routes
  app.post("/api/subjects/:subjectId/resources", 
    [authJwt.verifyToken, authJwt.isTeacher], 
    function(req, res, next) {
      controller.upload.single('file')(req, res, function(err) {
        if (err) {
          console.error('File upload error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 40MB.' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Only one file is allowed.' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Unexpected field name. Use "file" as the field name.' });
          }
          if (err.message === 'Only PDF files are allowed') {
            return res.status(400).json({ message: 'Only PDF files are allowed.' });
          }
          return res.status(400).json({ message: err.message || 'File upload failed.' });
        }
        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded. Please select a PDF file.' });
        }
        next();
      });
    },
    controller.uploadResource
  );
  
  app.put("/api/resources/:id", [authJwt.verifyToken, authJwt.isTeacher], controller.updateResource);
  
  app.delete("/api/resources/:id", [authJwt.verifyToken, authJwt.isTeacher], controller.deleteResource);
  
  // Check if subject has resources (for deletion validation)
  app.get("/api/subjects/:subjectId/resources/check", [authJwt.verifyToken, authJwt.isTeacher], controller.checkSubjectResources);
};
