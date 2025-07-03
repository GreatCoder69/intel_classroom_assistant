const express = require("express");
const router = express.Router();
const path = require("path");
const { diskUpload } = require("../middlewares/multer.config");

// POST /api/uploadimg
router.post("/uploadimg", diskUpload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filename = req.file.filename;
  const relativePath = `/uploads/${filename}`;

  res.status(200).json({
    message: "Image uploaded successfully",
    filename,
    path: relativePath
  });
});

module.exports = router;
