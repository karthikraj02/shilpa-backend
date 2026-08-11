const mongoose = require('mongoose');

const travelStorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    title: { type: String, required: true },
    destination: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    placesVisited: [{ type: String }],
    totalBudget: { type: Number },
    budgetBreakdown: {
        transport: { type: Number, default: 0 },
        stay: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        activities: { type: Number, default: 0 }
    },
    highlights: [{ type: String }],
    diary: { type: String }, // AI-generated diary
    summary: { type: String }, // AI-generated summary
    createdAt: { type: Date, default: Date.now }
});

travelStorySchema.index({ userId: 1, createdAt: -1 });
travelStorySchema.index({ bookingId: 1 });

module.exports = mongoose.model('TravelStory', travelStorySchema);
