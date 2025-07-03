const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..","..", "uploads");

// ✅ Ensure /uploads exists (with recursive true)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory at", uploadDir);
}

// ✅ Configure disk storage
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// ✅ Filter to allow only images

// ✅ Export both configurations
const diskUpload = multer({ storage: diskStorage});
const memoryUpload = multer({ storage: multer.memoryStorage()});

module.exports = {
  diskUpload,   // Saves file to disk (use in /uploadimg route)
  memoryUpload  // Keeps file in memory (for Gemini API if needed)
};
