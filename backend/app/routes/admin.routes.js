const { verifyToken } = require("../middlewares/authJwt");
const isAdmin = require("../middlewares/isAdmin");
const controller = require("../controllers/admin.controller");
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const Chat = require("../models/chat.model");

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "..", "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

module.exports = (app) => {
  // ✅ Convert uploaded PDF to DOCX for download
  app.get("/api/download-docx/:entryId", async (req, res) => {
    const { entryId } = req.params;

    try {
      const chat = await Chat.findOne({ "chat._id": entryId });
      if (!chat) return res.status(404).send("Chat not found");

      const entry = chat.chat.id(entryId);
      if (!entry) return res.status(404).send("Entry not found");

      const imageUrl = entry.imageUrl;
      if (!imageUrl || !imageUrl.toLowerCase().endsWith(".pdf")) {
        return res.status(400).send("Only PDF entries are allowed for conversion");
      }

      const inputPath = path.join(__dirname, "..", imageUrl);
      const outputPath = path.join(os.tmpdir(), `converted-${Date.now()}.docx`);
      const scriptPath = path.join(__dirname, "..", "..", "convert_pdf_to_docx.py");

      const pythonPath = "C:\\Users\\arsha\\miniconda3\\python.exe"; // use your preferred Python

      const child = spawn(pythonPath, [scriptPath, inputPath, outputPath]);

      child.on("close", (code) => {
        if (code !== 0) {
          return res.status(500).send("PDF to DOCX conversion failed");
        }

        res.download(outputPath, `converted-${entryId}.docx`, (err) => {
          if (err) {
            console.error("Download error:", err);
            res.status(500).send("File download failed");
          }
          fs.unlink(outputPath, () => {});
        });
      });

      child.stderr.on("data", (data) => {
        console.error(`Python error: ${data}`);
      });

    } catch (err) {
      console.error("Conversion error:", err);
      res.status(500).send("Server error");
    }
  });

  // ✅ Admin APIs
  app.get(
    "/api/admin/users-chats",
    [verifyToken, isAdmin],
    controller.getAllUsersWithChats
  );

  app.post(
    "/api/admin/toggle-status",
    [verifyToken, isAdmin],
    controller.toggleUserStatus
  );

  app.get(
    "/api/admin/user",
    verifyToken,
    controller.getUserByEmail
  );

  app.get(
    "/api/admin/summary",
    [verifyToken, isAdmin],
    controller.getAdminSummary
  );

  app.put(
    "/api/admin/user", upload.single("profileimg"),
    verifyToken,
    controller.adminUpdateUser
  );

  app.get(
    "/api/admin/error-logs",
    [verifyToken, isAdmin],
    controller.getErrorLogs
  );
  app.put("/api/admin/toggle-public", [verifyToken, isAdmin], controller.toggleChatVisibility);
};
