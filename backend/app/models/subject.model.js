const mongoose = require("mongoose");

const Subject = mongoose.model(
  "Subject",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      default: ""
    },
    color: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'],
      default: 'primary'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    studentProgress: {
      type: Map,
      of: Number,
      default: new Map()
    },
    assignments: [{
      title: String,
      description: String,
      dueDate: Date,
      createdDate: {
        type: Date,
        default: Date.now
      }
    }],
    enrolledStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    resources: [{
      title: String,
      url: String,
      type: {
        type: String,
        enum: ['pdf', 'video', 'link', 'document'],
        default: 'document'
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  })
);

module.exports = Subject;
