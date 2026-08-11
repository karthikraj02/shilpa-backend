const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { isValidObjectId, cleanString } = require('../middleware/validate');

// Brute-force protection on the credential and OTP surfaces.
const loginLimiter = rateLimit({ name: 'auth-login', windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please wait 15 minutes and try again.' });
const registerLimiter = rateLimit({ name: 'auth-register', windowMs: 60 * 60 * 1000, max: 10, message: 'Too many accounts created from this device. Please try again later.' });
const otpLimiter = rateLimit({ name: 'auth-otp', windowMs: 15 * 60 * 1000, max: 15, message: 'Too many OTP attempts. Please wait a few minutes and try again.' });
const resetLimiter = rateLimit({ name: 'auth-reset', windowMs: 60 * 60 * 1000, max: 10, message: 'Too many password reset requests. Please try again later.' });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MAX_GUEST_HISTORY = 40;

function normalizeGuestHistory(guestHistory) {
    if (!Array.isArray(guestHistory)) return [];
    return guestHistory.slice(-MAX_GUEST_HISTORY);
}

function signUserToken(res, user) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ msg: 'Server misconfigured (missing JWT secret)' });
    }
    const payload = { user: { id: user.id, role: user.role || 'user' } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }, (err, token) => {
        if (err) {
            console.error('JWT sign error:', err.message);
            return res.status(500).json({ msg: 'Could not create session' });
        }
        res.json({
            token,
            role: user.role || 'user',
            username: user.username || user.email?.split('@')[0],
            email: user.email,
            name: user.name,
            profilePicture: user.profilePicture,
        });
    });
}

// Email transporter factory (lazy — only fails at runtime if not configured)
function getMailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const guestHistory = normalizeGuestHistory(req.body.guestHistory);

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email and password are required' });
    }
    if (!name) {
        return res.status(400).json({ msg: 'Full name is required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: 'Invalid email format' });
    }

    // Strong password: min 8 chars, uppercase, lowercase, number
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPwd.test(password)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters with uppercase, lowercase and a number'
        });
    }

    try {
        // Check duplicate email
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ msg: 'An account with this email already exists' });
        }

        // Build username from name (unique)
        let baseUsername = name.toLowerCase().replace(/\s+/g, '_');
        let finalUsername = baseUsername;
        let counter = 1;
        while (await User.findOne({ username: finalUsername })) {
            finalUsername = `${baseUsername}_${counter++}`;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const user = new User({
            name,
            username: finalUsername,
            email,
            password,
            role: 'user',
            chatHistory: guestHistory,
            authProvider: 'local',
            isVerified: false,
            otp: otp,
            otpExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        await user.save();

        const transporter = getMailTransporter();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verify your AI Tourist Assistant account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Welcome to AI Tourist Assistant, ${user.name}!</h2>
                    <p style="font-size: 16px; color: #555; text-align: center;">Please verify your email address to activate your account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #f3f4f6; color: #111; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; display: inline-block;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">This code will expire in 10 minutes.</p>
                </div>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            return res.json({ msg: 'OTP sent to email', userId: user._id, requireOtp: true });
        } catch (emailErr) {
            console.error('Failed to send OTP email:', emailErr);
            // Even if email fails, we require OTP. They can use resend later.
            return res.json({ msg: 'Registered, but failed to send OTP email. Please try resending later.', userId: user._id, requireOtp: true });
        }
    } catch (err) {
        console.error('Register error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email already registered' });
        }
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────
router.post('/verify-otp', otpLimiter, async (req, res) => {
    const userId = cleanString(req.body.userId, 64);
    const otp = cleanString(req.body.otp, 10);
    if (!userId || !otp) {
        return res.status(400).json({ msg: 'User ID and OTP are required' });
    }
    if (!isValidObjectId(userId) || !/^\d{4,8}$/.test(otp)) {
        return res.status(400).json({ msg: 'Invalid verification request' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (user.isVerified) {
            return res.status(400).json({ msg: 'User is already verified' });
        }

        if (user.otp !== otp.toString()) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'OTP has expired. Please request a new one.' });
        }

        // OTP is valid
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        signUserToken(res, user);
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────
router.post('/resend-otp', otpLimiter, async (req, res) => {
    const userId = cleanString(req.body.userId, 64);
    if (!userId || !isValidObjectId(userId)) return res.status(400).json({ msg: 'User ID is required' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        if (user.isVerified) {
            return res.status(400).json({ msg: 'User is already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const transporter = getMailTransporter();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your new OTP for AI Tourist Assistant',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Hello ${user.name}!</h2>
                    <p style="font-size: 16px; color: #555; text-align: center;">Here is your new OTP to verify your account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #f3f4f6; color: #111; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; display: inline-block;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">This code will expire in 10 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ msg: 'A new OTP has been sent to your email.' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
    // Accept email OR username for backward compatibility
    const emailOrUsername = String(req.body.email || req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const guestHistory = normalizeGuestHistory(req.body.guestHistory);

    if (!emailOrUsername || !password) {
        return res.status(400).json({ msg: 'Email and password are required' });
    }

    // Email format validation (only if it looks like an email)
    if (emailOrUsername.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailOrUsername)) {
            return res.status(400).json({ msg: 'Invalid email format' });
        }
    }

    try {
        // Try email first, then username
        const user = await User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        if (!user.password) {
            const provider = user.authProvider === 'google' ? 'Google' : 'social login';
            return res.status(400).json({ msg: `This account uses ${provider}. Please use that sign-in option.` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid email or password' });

        // Check if user has verified their OTP
        if (user.isVerified === false) {
            return res.json({ msg: 'Please verify your email address to continue.', requireOtp: true, userId: user._id });
        }

        // Merge guest history
        if (guestHistory.length > 0) {
            const existingKeys = new Set((user.chatHistory || []).map(m => `${m.sender}:${m.text}`));
            const unique = guestHistory.filter(m => !existingKeys.has(`${m.sender}:${m.text}`));
            user.chatHistory = [...(user.chatHistory || []), ...unique];
            await user.save();
        }

        signUserToken(res, user);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires -otp -otpExpires');
        res.json(user);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ─────────────────────────────────────────────
// GET /api/auth/wishlist
// ─────────────────────────────────────────────
router.get('/wishlist', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        res.json(user.wishlist || []);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/wishlist/:id
// ─────────────────────────────────────────────
router.post('/wishlist/:id', auth, async (req, res) => {
    try {
        const tripId = req.params.id;
        if (!isValidObjectId(tripId)) {
            return res.status(400).json({ msg: 'Invalid trip reference' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (!user.wishlist) user.wishlist = [];
        
        const index = user.wishlist.indexOf(tripId);
        if (index > -1) {
            // Remove from wishlist
            user.wishlist.splice(index, 1);
        } else {
            // Add to wishlist
            user.wishlist.push(tripId);
        }
        await user.save();
        res.json(user.wishlist);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/social  (Google / Apple)
// ─────────────────────────────────────────────
router.post('/social', loginLimiter, async (req, res) => {
    const { provider, token: socialToken, email, name, providerId, profilePicture } = req.body;

    try {
        if (provider === 'google') {
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${socialToken}`);
            if (!googleRes.ok) {
                return res.status(401).json({ msg: 'Invalid Google token' });
            }
            const googleData = await googleRes.json();
            if (!googleData.email) {
                return res.status(401).json({ msg: 'Google token missing email' });
            }
        } else if (provider === 'apple') {
            if (!email && !providerId) {
                return res.status(401).json({ msg: 'Apple sign-in data missing' });
            }
        } else {
            return res.status(400).json({ msg: 'Invalid auth provider' });
        }

        let user = await User.findOne({
            $or: [
                { authProvider: provider, authProviderId: providerId },
                { googleId: providerId },
                { email: email }
            ]
        });

        if (user) {
            if (user.authProvider === 'local') {
                user.authProvider = provider;
                user.authProviderId = providerId;
            }
            if (provider === 'google') user.googleId = providerId;
            if (profilePicture && !user.profilePicture) user.profilePicture = profilePicture;
            if (name && !user.name) user.name = name;
            await user.save();
        } else {
            // Auto-create account
            const baseUsername = (name || email.split('@')[0]).toLowerCase().replace(/\s+/g, '_');
            let finalUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: finalUsername })) {
                finalUsername = `${baseUsername}_${counter++}`;
            }
            user = new User({
                username: finalUsername,
                email,
                name,
                profilePicture,
                authProvider: provider,
                authProviderId: providerId,
                googleId: provider === 'google' ? providerId : undefined,
                role: 'user',
                chatHistory: [],
            });
            await user.save();
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ msg: 'Server misconfigured (missing JWT secret)' });
        }
        const payload = { user: { id: user.id, role: user.role || 'user' } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                role: user.role || 'user',
                username: user.username,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
            });
        });
    } catch (err) {
        console.error('Social login error:', err);
        res.status(500).json({ msg: 'Social login failed' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post('/forgot-password', resetLimiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    try {
        const user = await User.findOne({ email });

        // Always respond positively (security: don't reveal if email exists)
        if (!user) {
            return res.json({ msg: 'If this email is registered, a reset link has been sent.' });
        }

        if (!user.password && user.authProvider !== 'local') {
            return res.status(400).json({
                msg: `This account uses ${user.authProvider === 'google' ? 'Google' : 'social'} sign-in. Password reset is not applicable.`
            });
        }

        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        // Send email
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            // Dev mode: return token in response for testing
            console.warn('[DEV] Email not configured. Reset URL:', resetUrl);
            return res.json({
                msg: 'Reset link generated (email not configured — check server console)',
                devResetUrl: resetUrl,
            });
        }

        const transporter = getMailTransporter();
        await transporter.sendMail({
            from: `"AI Tourist Assistant" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Inter, sans-serif; background: #000; color: #fff; padding: 40px; max-width: 560px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(0,85,255,0.4);">
                    <h2 style="color: #fff; margin-bottom: 8px;">Password Reset</h2>
                    <p style="color: #94a3b8; margin-bottom: 24px;">Hi ${user.name || user.username || 'there'},</p>
                    <p style="color: #cbd5e1; margin-bottom: 24px;">
                        You requested a password reset for your AI Tourist Assistant account.
                        Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
                    </p>
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 14px 32px; background: #0055ff; color: #fff;
                              border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 15px;
                              margin-bottom: 24px;">
                        Reset Password
                    </a>
                    <p style="color: #64748b; font-size: 13px;">
                        If you didn't request this, you can safely ignore this email.
                        Your password will not change.
                    </p>
                    <hr style="border-color: rgba(0,85,255,0.2); margin: 24px 0;" />
                    <p style="color: #475569; font-size: 12px;">
                        Or copy this link: <a href="${resetUrl}" style="color: #0055ff;">${resetUrl}</a>
                    </p>
                </div>
            `,
        });

        res.json({ msg: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ msg: 'Could not send reset email. Please try again later.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password/:token
// ─────────────────────────────────────────────
router.post('/reset-password/:token', resetLimiter, async (req, res) => {
    const rawToken = req.params.token;
    const password = String(req.body.password || '');

    if (!password) return res.status(400).json({ msg: 'New password is required' });

    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPwd.test(password)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters with uppercase, lowercase and a number'
        });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ msg: 'Reset link is invalid or has expired.' });
        }

        user.password = password; // pre-save hook will hash it
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ msg: 'Password reset successful. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ msg: 'Server error. Please try again.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/admin-login
// Separate endpoint for Admin Login — validates role = 'admin' before issuing token
// ─────────────────────────────────────────────
router.post('/admin-login', loginLimiter, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
        return res.status(400).json({ msg: 'Admin email and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: 'Invalid email format' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.warn('[admin-login] Failed attempt for unknown account');
            return res.status(401).json({ msg: 'Invalid Admin Email or Password' });
        }

        if (user.role !== 'admin') {
            console.warn('[admin-login] Non-admin account attempted admin sign-in');
            return res.status(403).json({ msg: 'Access denied. This account does not have admin privileges.' });
        }

        if (!user.password) {
            return res.status(400).json({ msg: 'This account uses social sign-in. Use regular login.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn('[admin-login] Failed password attempt for admin account');
            return res.status(401).json({ msg: 'Invalid Admin Email or Password' });
        }

        signUserToken(res, user);
    } catch (err) {
        console.error('[admin-login] Error:', err.message);
        res.status(500).json({ msg: 'Server error during admin login' });
    }
});

module.exports = router;

