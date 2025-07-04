const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  _id: String, // subject
  email: { type: String, required: true },

  // 📁 New: Category of the entire subject
  subjectCategory: {
    type: String,
    default: 'General' // You can change this default as needed
  },

  // 🌍 New: Subject visibility flag (public by default)
  isPublic: {
    type: Boolean,
    default: true
  },

  chat: [
    {
      question: String,
      answer: String,
      timestamp: { type: Date, default: Date.now },
      imageUrl: String, // to store uploaded image path
      downloadCount: {
        type: Number,
        default: 0
      },

      // 📂 New: Per-message category (optional)
      chatCategory: {
        type: String,
        default: 'Uncategorized'
      },

      // 👇 Metadata fields
      pageNumber: {
        type: Number,
        default: 1
      },
      entryNumber: {
        type: Number,
        default: 1
      },

      // ⏱️ New: Time taken in milliseconds for LLM response
      responseTime: {
        type: Number,
        default: 0
      },

      // 🤖 New: LLM model used for this answer
      modelUsed: {
        type: String,
        default: ''
      },

      // 📚 New: Subject context selected for this message
      chatSubject: {
        type: String,
        default: 'General'
      },

      // 👤 New: Role of the user who sent this message
      userRole: {
        type: String,
        default: 'student'
      }
    }
  ],

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', ChatSchema);
