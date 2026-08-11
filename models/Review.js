const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    destinationId: { type: String },
    hotelId: { type: String },
    transportId: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
    approved: { type: Boolean, default: false },  // Admin must approve before showing publicly
}, { timestamps: true });

// Public review listings filter on approval + entity, sorted by recency/rating
reviewSchema.index({ approved: 1, destinationId: 1, createdAt: -1 });
reviewSchema.index({ approved: 1, hotelId: 1, createdAt: -1 });
reviewSchema.index({ approved: 1, transportId: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);

