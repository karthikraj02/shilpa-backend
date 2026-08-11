const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const TripPlan = require('../models/TripPlan');
const { requireObjectIdParam, pick, cleanString, boundedNumber, isValidObjectId } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/** Whitelist for trip-plan writes. */
function sanitizeTripPlan(body, { partial = false } = {}) {
    const allowed = pick(body, [
        'destination', 'state', 'country', 'category', 'duration', 'price', 'discount',
        'heroImage', 'gallery', 'rating', 'reviewCount', 'description', 'attractions',
        'bestTime', 'transport', 'hotel', 'meals', 'cancellationPolicy', 'seatsLeft',
        'weather', 'itinerary',
    ]);

    for (const key of ['destination', 'state', 'country', 'category', 'duration', 'bestTime',
                       'transport', 'hotel', 'meals', 'cancellationPolicy', 'weather']) {
        if (allowed[key] !== undefined) allowed[key] = cleanString(allowed[key], 300);
    }
    if (allowed.description !== undefined) allowed.description = cleanString(allowed.description, 5000);
    if (allowed.heroImage !== undefined) allowed.heroImage = cleanString(allowed.heroImage, 1000);
    if (allowed.price !== undefined) allowed.price = boundedNumber(allowed.price, { min: 0, max: 100000000, fallback: 0 });
    if (allowed.discount !== undefined) allowed.discount = boundedNumber(allowed.discount, { min: 0, max: 100, fallback: 0 });
    if (allowed.rating !== undefined) allowed.rating = boundedNumber(allowed.rating, { min: 0, max: 5, fallback: 4.5 });
    if (allowed.seatsLeft !== undefined) allowed.seatsLeft = boundedNumber(allowed.seatsLeft, { min: 0, max: 100000, fallback: 10 });
    if (allowed.reviewCount !== undefined) allowed.reviewCount = boundedNumber(allowed.reviewCount, { min: 0, max: 10000000, fallback: 0 });

    // Popularity counters are server-owned and never settable by a client.
    delete allowed.views;
    delete allowed.likes;
    delete allowed.bookings;
    delete allowed.popularityScore;

    if (!partial) {
        for (const required of ['destination', 'state', 'category', 'duration', 'heroImage', 'description']) {
            if (!allowed[required]) {
                const err = new Error(`${required} is required`);
                err.status = 400; err.expose = true;
                throw err;
            }
        }
        if (allowed.price === undefined) allowed.price = 0;
    }
    return allowed;
}

function recomputePopularity(trip) {
    return ((trip.views || 0) * 0.1) + ((trip.bookings || 0) * 5) + ((trip.likes || 0) * 0.5);
}

// Public catalogue
router.get('/', asyncHandler(async (req, res) => {
    const tripPlans = await TripPlan.find().limit(500).lean();
    res.json(tripPlans);
}));

// Catalogue management is administrator-only (was any logged-in user)
router.post('/', adminAuth, asyncHandler(async (req, res) => {
    const saved = await new TripPlan(sanitizeTripPlan(req.body)).save();
    res.json(saved);
}));

router.put('/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const tripPlan = await TripPlan.findByIdAndUpdate(
        req.params.id,
        { $set: sanitizeTripPlan(req.body, { partial: true }) },
        { new: true, runValidators: true }
    );
    if (!tripPlan) return res.status(404).json({ msg: 'Trip Plan not found' });
    res.json(tripPlan);
}));

router.delete('/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const deleted = await TripPlan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'Trip Plan not found' });
    res.json({ msg: 'Trip Plan deleted' });
}));

// Engagement counters — atomic increments, rate limited against inflation
router.post('/:id/view',
    requireObjectIdParam('id'),
    rateLimit({ name: 'trip-view', windowMs: 60 * 1000, max: 60 }),
    asyncHandler(async (req, res) => {
        const trip = await TripPlan.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
        if (trip) {
            trip.popularityScore = recomputePopularity(trip);
            await trip.save();
        }
        res.json({ success: true });
    })
);

router.post('/:id/like',
    requireObjectIdParam('id'),
    rateLimit({ name: 'trip-like', windowMs: 60 * 1000, max: 30 }),
    asyncHandler(async (req, res) => {
        const trip = await TripPlan.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
        if (!trip) return res.status(404).json({ msg: 'Trip Plan not found' });
        trip.popularityScore = recomputePopularity(trip);
        await trip.save();
        res.json({ success: true, likes: trip.likes });
    })
);

// AI recommendations — the model may only choose from IDs that already exist
router.post('/recommendations',
    rateLimit({ name: 'trip-recommend', windowMs: 5 * 60 * 1000, max: 30 }),
    optionalAuth,
    asyncHandler(async (req, res) => {
        const popularFallback = () => TripPlan.find().sort({ popularityScore: -1 }).limit(4).lean();

        const history = Array.isArray(req.body.history)
            ? req.body.history.filter(id => typeof id === 'string' && isValidObjectId(id)).slice(0, 50) : [];
        const wishlist = Array.isArray(req.body.wishlist)
            ? req.body.wishlist.filter(id => typeof id === 'string' && isValidObjectId(id)).slice(0, 50) : [];

        if ((history.length === 0 && wishlist.length === 0) || !process.env.GEMINI_API_KEY) {
            return res.json(await popularFallback());
        }

        const allTrips = await TripPlan.find().select('_id destination state category tags rating price').limit(200).lean();

        let recommendedIds = [];
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

            const prompt = `
        You are a travel recommendation engine.
        User's recent history of package IDs: ${JSON.stringify(history)}
        User's wishlist package IDs: ${JSON.stringify(wishlist)}

        Available packages: ${JSON.stringify(allTrips)}

        Based on the user's history and wishlist, select the top 4 most relevant packages from the available list that the user has NOT seen or wishlisted yet.
        Return ONLY a raw JSON array of the recommended package _ids.
        Example: ["id1", "id2"]
        `;

            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(text);

            // Nothing from the model is trusted: only well-formed ObjectIds that
            // exist in our own catalogue survive.
            if (Array.isArray(parsed)) {
                const catalogue = new Set(allTrips.map(t => String(t._id)));
                recommendedIds = parsed
                    .filter(id => typeof id === 'string' && isValidObjectId(id) && catalogue.has(id))
                    .slice(0, 4);
            }
        } catch (err) {
            console.error('Recommendation AI failure:', err.message);
        }

        if (recommendedIds.length === 0) {
            return res.json(await popularFallback());
        }

        const recommendations = await TripPlan.find({ _id: { $in: recommendedIds } }).lean();
        res.json(recommendations);
    })
);

module.exports = router;
