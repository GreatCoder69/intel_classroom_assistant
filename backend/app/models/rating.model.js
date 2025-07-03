const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profileimg: { type: String, required: true },
  comment: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, required: true },
  timestamp: { type: Date, default: Date.now }
});

const RatingSchema = new mongoose.Schema({
  subject: { type: String, required: true }, // same as chat._id
  email: { type: String, required: true },   // owner of the chat

  comments: [CommentSchema],

  totalRating: { type: Number, default: 0 },
  noOfRatings: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 }
});

// Optional: Automatically update avgRating before saving
RatingSchema.pre('save', function (next) {
  if (this.noOfRatings > 0) {
    this.avgRating = this.totalRating / this.noOfRatings;
  } else {
    this.avgRating = 0;
  }
  next();
});

module.exports = mongoose.model('Rating', RatingSchema);
