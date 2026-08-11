const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { requireObjectIdParam, isValidObjectId, cleanString } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const TravelStory = require('../models/TravelStory');
const Booking = require('../models/Booking');
const { GoogleGenerativeAI } = require("@google/generative-ai");

function getStoryModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const err = new Error('Story generation is temporarily unavailable');
        err.status = 503;
        err.expose = true;
        throw err;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
}

const FALLBACK_STORY = {
    diary: "An amazing journey filled with beautiful memories.",
    summary: "A trip to remember forever.",
};

/**
 * The model is asked for JSON, but nothing it returns is trusted:
 * only the two expected string fields are read, each is length-capped, and a
 * fallback is used whenever the shape is wrong.
 */
function parseStoryResponse(rawText) {
    if (typeof rawText !== 'string') return { ...FALLBACK_STORY };

    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        return { ...FALLBACK_STORY };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ...FALLBACK_STORY };
    }

    const diary = typeof parsed.diary === 'string' ? cleanString(parsed.diary, 20000) : '';
    const summary = typeof parsed.summary === 'string' ? cleanString(parsed.summary, 2000) : '';

    return {
        diary: diary || FALLBACK_STORY.diary,
        summary: summary || FALLBACK_STORY.summary,
    };
}

// ─────────────────────────────────────────────
// POST /api/stories/generate
// The booking must exist AND belong to the caller.
// ─────────────────────────────────────────────
router.post(
    '/generate',
    auth,
    rateLimit({ name: 'story-generate', windowMs: 60 * 60 * 1000, max: 20, message: 'Story generation limit reached. Please try again later.' }),
    asyncHandler(async (req, res) => {
        const bookingId = typeof req.body.bookingId === 'string' ? req.body.bookingId : '';
        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking reference' });
        }

        const booking = await Booking.findById(bookingId).populate('destination');
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // A user may only generate a story for their own booking.
        if (!booking.user || String(booking.user) !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // One story per booking.
        const existing = await TravelStory.findOne({ bookingId: booking._id, userId: req.user.id });
        if (existing) return res.status(200).json(existing);

        const destName = booking.destination ? booking.destination.name : 'Unknown Destination';

        const prompt = `Write a beautiful travel diary and summary for a trip to ${destName}. 
        The traveler spent ₹${booking.totalCost || 0} in total.
        Return ONLY a JSON object with two fields:
        {
            "diary": "A day-by-day narrative of the trip...",
            "summary": "A short poetic summary of the experience."
        }
        Do not include markdown blocks around the JSON.`;

        let aiContent = { ...FALLBACK_STORY };
        try {
            const model = getStoryModel();
            const result = await model.generateContent(prompt);
            aiContent = parseStoryResponse(result.response.text());
        } catch (aiErr) {
            console.error('Story generation AI failure:', aiErr.message);
            // Fall through with the safe fallback rather than failing the request.
        }

        // Every persisted field is derived from the database booking, not the request.
        const story = new TravelStory({
            userId: req.user.id,
            bookingId: booking._id,
            title: `My Journey to ${destName}`,
            destination: destName,
            startDate: booking.travelDate,
            totalBudget: booking.totalCost,
            budgetBreakdown: {
                transport: Number(booking.transport?.cost) || 0,
                stay: Number(booking.stay?.cost) || 0,
                food: Number(booking.food?.cost) || 0,
            },
            diary: aiContent.diary,
            summary: aiContent.summary,
        });

        await story.save();

        booking.tripCompleted = true;
        booking.completedAt = new Date();
        booking.travelStoryGenerated = true;
        await booking.save();

        res.status(201).json(story);
    })
);

// ─────────────────────────────────────────────
// GET /api/stories/user/:userId — own stories only
// ─────────────────────────────────────────────
router.get('/user/:userId', auth, asyncHandler(async (req, res) => {
    if (req.params.userId && req.params.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const stories = await TravelStory.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    res.json(stories);
}));

// ─────────────────────────────────────────────
// GET /api/stories/:id — own story only
// ─────────────────────────────────────────────
router.get('/:id', auth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const story = await TravelStory.findById(req.params.id).lean();
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (String(story.userId) !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    res.json(story);
}));

module.exports = router;
