const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const UserPreferences = require('../models/UserPreferences');
const { pick, cleanString, boundedNumber, safeDate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Every route below resolves the target user from the JWT.
 * The :userId path segment is retained so existing frontend calls keep working,
 * but it is only ever compared against the authenticated identity — it is never
 * used to look anything up.
 */
function enforceSelf(req, res, next) {
    if (req.params.userId && req.params.userId !== req.user.id) {
        return res.status(403).json({ msg: 'Access denied' });
    }
    next();
}

/** Whitelist + coerce the preference document the client is allowed to set. */
function sanitizePreferences(body) {
    const allowed = pick(body, [
        'favoriteDestinations', 'budgetPreference', 'travelStyle', 'dietaryPreference',
        'preferredLanguage', 'emergencyContacts', 'voiceSettings',
    ]);
    const update = {};

    if (Array.isArray(allowed.favoriteDestinations)) {
        update.favoriteDestinations = allowed.favoriteDestinations
            .map(d => cleanString(d, 120)).filter(Boolean).slice(0, 100);
    }
    if (['budget', 'mid-range', 'luxury'].includes(allowed.budgetPreference)) {
        update.budgetPreference = allowed.budgetPreference;
    }
    if (Array.isArray(allowed.travelStyle)) {
        update.travelStyle = allowed.travelStyle
            .map(s => cleanString(s, 60)).filter(Boolean).slice(0, 50);
    }
    if (['veg', 'non-veg', 'both'].includes(allowed.dietaryPreference)) {
        update.dietaryPreference = allowed.dietaryPreference;
    }
    if (['en', 'hi', 'kn'].includes(allowed.preferredLanguage)) {
        update.preferredLanguage = allowed.preferredLanguage;
    }
    if (Array.isArray(allowed.emergencyContacts)) {
        update.emergencyContacts = allowed.emergencyContacts.slice(0, 20).map(c => ({
            name: cleanString(c?.name, 120),
            phone: cleanString(c?.phone, 30),
            relation: cleanString(c?.relation, 60),
        }));
    }
    if (allowed.voiceSettings && typeof allowed.voiceSettings === 'object') {
        update.voiceSettings = {
            speakerOn: !!allowed.voiceSettings.speakerOn,
            voiceGender: ['male', 'female'].includes(allowed.voiceSettings.voiceGender)
                ? allowed.voiceSettings.voiceGender : 'female',
            speechSpeed: boundedNumber(allowed.voiceSettings.speechSpeed, { min: 0.5, max: 2, fallback: 1.0 }),
        };
    }
    return update;
}

// GET /api/preferences/:userId — own preferences only
router.get('/:userId', auth, enforceSelf, asyncHandler(async (req, res) => {
    let prefs = await UserPreferences.findOne({ userId: req.user.id }).lean();
    if (!prefs) {
        // Unsaved default document, exactly as before (nothing is persisted here).
        prefs = new UserPreferences({ userId: req.user.id }).toObject();
    }
    res.json(prefs);
}));

// PUT /api/preferences/:userId — own preferences only
router.put('/:userId', auth, enforceSelf, asyncHandler(async (req, res) => {
    const update = sanitizePreferences(req.body);
    const prefs = await UserPreferences.findOneAndUpdate(
        { userId: req.user.id },
        { $set: update, $setOnInsert: { userId: req.user.id } },
        { new: true, upsert: true, runValidators: true }
    );
    res.json(prefs);
}));

// POST /api/preferences/trip — log a completed trip against the caller
router.post('/trip', auth, asyncHandler(async (req, res) => {
    const trip = {
        destination: cleanString(req.body.destination, 200),
        date: safeDate(req.body.date) || new Date(),
        duration: boundedNumber(req.body.duration, { min: 0, max: 365, fallback: 0 }),
        rating: boundedNumber(req.body.rating, { min: 1, max: 5, fallback: null }),
        notes: cleanString(req.body.notes, 2000),
    };
    if (!trip.destination) return res.status(400).json({ msg: 'Destination is required' });

    const prefs = await UserPreferences.findOneAndUpdate(
        { userId: req.user.id },
        { $push: { previousTrips: { $each: [trip], $slice: -200 } }, $setOnInsert: { userId: req.user.id } },
        { new: true, upsert: true }
    );
    res.json(prefs);
}));

// GET /api/preferences/memory/:userId — AI memory context for the caller
router.get('/memory/:userId', auth, enforceSelf, asyncHandler(async (req, res) => {
    const prefs = await UserPreferences.findOne({ userId: req.user.id }).lean();
    if (!prefs) return res.json({ context: 'No specific user preferences saved yet.' });

    let context = `User Preferences:\n`;
    context += `- Budget: ${prefs.budgetPreference}\n`;
    context += `- Dietary: ${prefs.dietaryPreference}\n`;
    if (prefs.favoriteDestinations && prefs.favoriteDestinations.length > 0) {
        context += `- Favorite Destinations: ${prefs.favoriteDestinations.join(', ')}\n`;
    }
    if (prefs.travelStyle && prefs.travelStyle.length > 0) {
        context += `- Travel Style: ${prefs.travelStyle.join(', ')}\n`;
    }
    if (prefs.previousTrips && prefs.previousTrips.length > 0) {
        context += `- Previous Trips: ${prefs.previousTrips.map(t => t.destination).join(', ')}\n`;
    }

    res.json({ context, language: prefs.preferredLanguage });
}));

module.exports = router;
