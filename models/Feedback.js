const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: { type: String, default: '' },
  chatId: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  quickTags: { type: [String], default: [] },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
