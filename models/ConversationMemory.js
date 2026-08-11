const mongoose = require('mongoose');

const conversationMemorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    favoriteDestinations: { type: [String], default: [] },
    budgetPreference: { type: String, default: '' },
    travelStyle: { type: [String], default: [] },
    previousSearches: { type: [String], default: [] },
    transportPreference: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ConversationMemory', conversationMemorySchema);
