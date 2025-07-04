const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true // For faster queries
  },
  userEmail: { 
    type: String, 
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
    index: true // For filtering in statistics
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  chatSubject: {
    type: String,
    default: 'General',
    index: true // For subject-based statistics
  },
  subject: {
    type: String,
    required: true // The main subject/topic
  },
  imageUrl: {
    type: String,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },
  responseTime: {
    type: Number,
    default: 0
  },
  modelUsed: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound indexes for efficient queries
ChatMessageSchema.index({ userRole: 1, chatSubject: 1 });
ChatMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
