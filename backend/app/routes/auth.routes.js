const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/authJwt");

const multer = require("multer");
const path = require("path");

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "..", "uploads")); // ✅ Absolute path to app/uploads // ensure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    [verifySignUp.checkDuplicateUsernameOrEmail],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);

  // ✅ Updated: uses Multer + Token Middleware
  app.put(
    "/api/auth/update",
    [verifyToken, upload.single("profileimg")],
    controller.updateUser
  );

  app.get("/api/auth/me", verifyToken, controller.getMe);
};
