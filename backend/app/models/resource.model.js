const mongoose = require("mongoose");

const Resource = mongoose.model(
  "Resource",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    fileName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // PDF content extraction fields
    extractedText: {
      type: String,
      default: ''
    },
    textChunks: [{
      page: Number,
      content: String,
      wordCount: Number
    }],
    extractionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    extractionDate: {
      type: Date
    },
    pageCount: {
      type: Number,
      default: 0
    },
    wordCount: {
      type: Number,
      default: 0
    },
    // JSON file creation status
    jsonFileStatus: {
      type: String,
      enum: ['pending', 'created', 'failed'],
      default: 'pending'
    },
    jsonFilePath: {
      type: String,
      default: ''
    }
  }, {
    timestamps: true
  })
);

module.exports = Resource;
