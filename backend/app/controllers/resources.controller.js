const db = require("../models");
const Resource = db.resource;
const Subject = db.subject;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/resources');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 40 * 1024 * 1024 // 40MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Upload a new resource for a subject (Teacher only)
 */
exports.uploadResource = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file ? { 
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype 
      } : null
    });

    const { subjectId, name, description } = req.body;
    const uploadedBy = req.userId;
    
    // Validate required fields
    if (!subjectId) {
      return res.status(400).send({ message: "Subject ID is required!" });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).send({ message: "Resource name is required!" });
    }
    
    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ message: "Subject not found!" });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded. Please select a PDF file." });
    }
    
    // Additional file validation
    if (req.file.size === 0) {
      return res.status(400).send({ message: "Empty file is not allowed!" });
    }
    
    if (req.file.size > 40 * 1024 * 1024) {
      return res.status(400).send({ message: "File size too large. Maximum size is 40MB." });
    }
    
    const resource = new Resource({
      name: name.trim(),
      description: description ? description.trim() : '',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      subjectId: subjectId,
      uploadedBy: uploadedBy
    });
    
    await resource.save();
    
    console.log('Resource saved successfully:', resource._id);
    
    res.status(201).send({
      message: "Resource uploaded successfully!",
      resource: {
        id: resource._id,
        name: resource.name,
        description: resource.description,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        uploadDate: resource.uploadDate,
        subjectId: resource.subjectId
      }
    });
  } catch (err) {
    console.error('Error in uploadResource:', err);
    // If there was an error, delete the uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Deleted file after error:', req.file.path);
      } catch (deleteErr) {
        console.error('Error deleting file:', deleteErr);
      }
    }
    res.status(500).send({ message: err.message || "Server error during upload" });
  }
};

/**
 * Get all resources for a subject
 */
exports.getResourcesBySubject = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    
    const resources = await Resource.find({ 
      subjectId: subjectId,
      isActive: true 
    }).populate('uploadedBy', 'name email').sort({ uploadDate: -1 });
    
    res.status(200).send(resources);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get a specific resource by ID
 */
exports.getResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId).populate('subjectId uploadedBy');
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    res.status(200).send(resource);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Download a resource file
 */
exports.downloadResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Check if file exists
    if (!fs.existsSync(resource.filePath)) {
      return res.status(404).send({ message: "File not found on server!" });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', resource.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resource.fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(resource.filePath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update a resource (Teacher only)
 */
exports.updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const { name, description } = req.body;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Update fields
    if (name) resource.name = name;
    if (description) resource.description = description;
    
    await resource.save();
    
    res.status(200).send({
      message: "Resource updated successfully!",
      resource: {
        id: resource._id,
        name: resource.name,
        description: resource.description,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        uploadDate: resource.uploadDate
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Delete a resource (Teacher only)
 */
exports.deleteResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Delete the file from filesystem
    if (fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
    }
    
    // Delete the resource from database
    await Resource.findByIdAndDelete(resourceId);
    
    res.status(200).send({ message: "Resource deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Check if a subject has resources (used before subject deletion)
 */
exports.checkSubjectResources = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    
    const resourceCount = await Resource.countDocuments({ 
      subjectId: subjectId,
      isActive: true 
    });
    
    res.status(200).send({ 
      hasResources: resourceCount > 0,
      resourceCount: resourceCount 
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Export the multer upload middleware
exports.upload = upload;
