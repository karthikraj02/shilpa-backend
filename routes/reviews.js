const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const { cleanString, boundedNumber } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────
// POST /api/reviews — add a review (guest or authenticated)
// ─────────────────────────────────────────────
router.post(
    '/',
    rateLimit({ name: 'review-submit', windowMs: 60 * 60 * 1000, max: 20, message: 'Too many reviews submitted. Please try again later.' }),
    optionalAuth,
    asyncHandler(async (req, res) => {
        const rating = boundedNumber(req.body.rating, { min: 1, max: 5, fallback: null });
        if (rating === null || !Number.isInteger(rating)) {
            return res.status(400).json({ msg: 'Rating must be a whole number between 1 and 5' });
        }

        const reviewText = cleanString(req.body.reviewText, 5000);
        if (!reviewText) return res.status(400).json({ msg: 'Review text is required' });

        const entityIds = {
            destinationId: cleanString(req.body.destinationId, 64) || null,
            hotelId: cleanString(req.body.hotelId, 64) || null,
            transportId: cleanString(req.body.transportId, 64) || null,
        };
        if (!entityIds.destinationId && !entityIds.hotelId && !entityIds.transportId) {
            return res.status(400).json({ msg: 'A destination, hotel or transport reference is required' });
        }

        let userId = null;
        let submitterName;

        if (req.user) {
            // Authenticated: the display name comes from the account, so a
            // request body can never impersonate another username.
            const userObj = await User.findById(req.user.id).select('username name').lean();
            if (userObj) {
                userId = req.user.id;
                submitterName = userObj.username || userObj.name || 'Traveller';
            }
        }

        if (!submitterName) {
            // Guest: free-text name is accepted but clearly not an identity claim.
            const guestName = cleanString(req.body.username, 60);
            submitterName = guestName || 'Anonymous Guest';
        }

        const newReview = new Review({
            user: userId,
            username: submitterName,
            ...entityIds,
            rating,
            reviewText,
            approved: false,   // moderation state is server-controlled
        });

        await newReview.save();
        res.status(201).json(newReview);
    })
);

// ─────────────────────────────────────────────
// GET /api/reviews/:entityId — approved reviews + stats
// ─────────────────────────────────────────────
router.get('/:entityId', asyncHandler(async (req, res) => {
    const entityId = cleanString(req.params.entityId, 64);
    if (!entityId) return res.status(400).json({ msg: 'Invalid reference' });

    const sort = req.query.sort === 'highest'
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const orClauses = [
        { destinationId: entityId },
        { hotelId: entityId },
        { transportId: entityId },
    ];

    const reviews = await Review.find({ approved: true, $or: orClauses })
        .sort(sort)
        .limit(500)
        .lean();

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });

    res.json({
        reviews,
        stats: {
            totalReviews,
            averageRating: Number(averageRating),
            distribution,
        },
    });
}));

module.exports = router;
