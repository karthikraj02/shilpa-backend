const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        default: 'New Conversation'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Chat list for a user, newest first
ChatSchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', ChatSchema);
