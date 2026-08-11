const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Core identity
    name: { type: String, trim: true },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { 
        type: String, 
        unique: true, 
        sparse: true, 
        trim: true, 
        lowercase: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow empty if sparse
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },

    // Auth
    password: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },

    // Social login
    authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
    authProviderId: { type: String },
    googleId: { type: String },
    profilePicture: { type: String },

    // OTP Verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // Password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Legacy / features
    chatHistory: { type: Array, default: [] },
    
    // Trip Packages Features
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TripPlan' }],
    recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TripPlan' }]
}, {
    timestamps: true   // adds createdAt + updatedAt automatically
});

// Hash password before saving (only when modified)
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
