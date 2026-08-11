const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Destination = require('../models/Destination');
const { requireObjectIdParam, pick, cleanString, boundedNumber } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const CATEGORIES = ['beach', 'mountain', 'historical', 'cultural', 'adventure', 'religious', 'wildlife'];

/** Whitelist for destination writes — blocks mass assignment of unknown keys. */
function sanitizeDestination(body, { partial = false } = {}) {
    const allowed = pick(body, [
        'name', 'location', 'category', 'description', 'price', 'imageUrl',
        'heroImageUrl', 'rating', 'estimatedBudget', 'image_gallery', 'best_time',
        'weather', 'distance', 'attractions', 'hotels', 'transport_options',
        'budgets', 'travel_tips', 'safety_tips', 'nearby_attractions', 'foods',
        'itinerary_1_day', 'itinerary_2_day', 'itinerary_3_day',
    ]);

    if (allowed.name !== undefined) allowed.name = cleanString(allowed.name, 200);
    if (allowed.location !== undefined) allowed.location = cleanString(allowed.location, 200);
    if (allowed.description !== undefined) allowed.description = cleanString(allowed.description, 5000);
    if (allowed.imageUrl !== undefined) allowed.imageUrl = cleanString(allowed.imageUrl, 1000);
    if (allowed.heroImageUrl !== undefined) allowed.heroImageUrl = cleanString(allowed.heroImageUrl, 1000);
    if (allowed.best_time !== undefined) allowed.best_time = cleanString(allowed.best_time, 200);
    if (allowed.distance !== undefined) allowed.distance = cleanString(allowed.distance, 100);

    if (allowed.category !== undefined) {
        const cat = String(allowed.category).toLowerCase();
        if (!CATEGORIES.includes(cat)) {
            const err = new Error('Invalid category');
            err.status = 400; err.expose = true;
            throw err;
        }
        allowed.category = cat;
    }
    if (allowed.price !== undefined) {
        allowed.price = boundedNumber(allowed.price, { min: 0, max: 100000000, fallback: 0 });
    }
    if (allowed.rating !== undefined) {
        allowed.rating = boundedNumber(allowed.rating, { min: 0, max: 5, fallback: 0 });
    }
    if (allowed.estimatedBudget !== undefined) {
        allowed.estimatedBudget = boundedNumber(allowed.estimatedBudget, { min: 0, max: 100000000, fallback: 0 });
    }

    if (!partial) {
        for (const required of ['name', 'location', 'category', 'description', 'imageUrl']) {
            if (!allowed[required]) {
                const err = new Error(`${required} is required`);
                err.status = 400; err.expose = true;
                throw err;
            }
        }
    }
    return allowed;
}

// Public catalogue
router.get('/', asyncHandler(async (req, res) => {
    const destinations = await Destination.find().limit(500).lean();
    res.json(destinations);
}));

// Writes are administrator-only (previously any logged-in user could add/edit/delete)
router.post('/', adminAuth, asyncHandler(async (req, res) => {
    const dest = new Destination(sanitizeDestination(req.body));
    const saved = await dest.save();
    res.json(saved);
}));

router.put('/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const dest = await Destination.findByIdAndUpdate(
        req.params.id,
        { $set: sanitizeDestination(req.body, { partial: true }) },
        { new: true, runValidators: true }
    );
    if (!dest) return res.status(404).json({ msg: 'Destination not found' });
    res.json(dest);
}));

router.delete('/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const deleted = await Destination.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'Destination not found' });
    res.json({ msg: 'Destination deleted' });
}));

module.exports = router;
