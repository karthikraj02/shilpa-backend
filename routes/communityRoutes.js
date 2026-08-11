const express = require('express');
const router = express.Router();
const CommunityPlace = require('../models/CommunityPlace');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');
const { requireObjectIdParam, cleanString, boundedNumber } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Submissions are auto-approved only when COMMUNITY_AUTO_APPROVE=true is set
 * explicitly. The default is the moderated flow:
 *   submit → pending → admin approves/rejects → visible.
 */
const AUTO_APPROVE = process.env.COMMUNITY_AUTO_APPROVE === 'true';

// ─────────────────────────────────────────────
// GET /api/community/approved — public
// ─────────────────────────────────────────────
router.get('/approved', asyncHandler(async (req, res) => {
    const places = await CommunityPlace.find({ isApproved: true })
        .populate('submittedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    res.json(places);
}));

// ─────────────────────────────────────────────
// GET /api/community/pending — administrators only
// ─────────────────────────────────────────────
router.get('/pending', adminAuth, asyncHandler(async (req, res) => {
    const places = await CommunityPlace.find({ isApproved: false })
        .populate('submittedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    res.json(places);
}));

// ─────────────────────────────────────────────
// POST /api/community/submit — authenticated users
// ─────────────────────────────────────────────
router.post(
    '/submit',
    auth,
    rateLimit({ name: 'community-submit', windowMs: 60 * 60 * 1000, max: 20, message: 'You have submitted a lot of places recently. Please try again later.' }),
    asyncHandler(async (req, res) => {
        const placeName = cleanString(req.body.placeName, 200);
        const description = cleanString(req.body.description, 5000);
        const category = cleanString(req.body.category, 60);
        const location = cleanString(req.body.location, 200);

        if (!placeName || !description || !category || !location) {
            return res.status(400).json({ error: 'Place name, description, category and location are required' });
        }

        const images = Array.isArray(req.body.images)
            ? req.body.images.filter(i => typeof i === 'string' && /^https?:\/\//i.test(i)).slice(0, 10)
            : [];
        const tags = Array.isArray(req.body.tags)
            ? req.body.tags.map(t => cleanString(t, 40)).filter(Boolean).slice(0, 20)
            : [];

        const coordinates = req.body.coordinates && typeof req.body.coordinates === 'object'
            ? {
                lat: boundedNumber(req.body.coordinates.lat, { min: -90, max: 90, fallback: undefined }),
                lng: boundedNumber(req.body.coordinates.lng, { min: -180, max: 180, fallback: undefined }),
            }
            : undefined;

        // Moderation state and ownership are set by the server only.
        const newPlace = new CommunityPlace({
            placeName,
            description,
            category,
            location,
            images,
            tags,
            coordinates,
            submittedBy: req.user.id,
            isApproved: AUTO_APPROVE,
            status: AUTO_APPROVE ? 'approved' : 'pending',
            approvedAt: AUTO_APPROVE ? new Date() : undefined,
            rating: 0,
            reviewCount: 0,
            reviews: [],
        });

        await newPlace.save();

        res.status(201).json({
            message: AUTO_APPROVE
                ? 'Place submitted successfully. It has been auto-approved for AI learning.'
                : 'Place submitted successfully. It will appear once a moderator approves it.',
            place: newPlace,
        });
    })
);

// ─────────────────────────────────────────────
// PUT /api/community/approve/:id — administrators only
// ─────────────────────────────────────────────
router.put('/approve/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const place = await CommunityPlace.findByIdAndUpdate(
        req.params.id,
        { $set: { isApproved: true, status: 'approved', approvedAt: new Date() } },
        { new: true }
    );
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json({ message: 'Place approved successfully', place });
}));

// ─────────────────────────────────────────────
// PUT /api/community/reject/:id — administrators only
// ─────────────────────────────────────────────
router.put('/reject/:id', adminAuth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const place = await CommunityPlace.findByIdAndUpdate(
        req.params.id,
        { $set: { isApproved: false, status: 'rejected' } },
        { new: true }
    );
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json({ message: 'Place rejected', place });
}));

// ─────────────────────────────────────────────
// DELETE /api/community/:id — administrator, or the original submitter
// ─────────────────────────────────────────────
router.delete('/:id', auth, requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const place = await CommunityPlace.findById(req.params.id).select('submittedBy');
    if (!place) return res.status(404).json({ error: 'Place not found' });

    const isOwner = String(place.submittedBy) === req.user.id;
    if (!isOwner) {
        const User = require('../models/User');
        const user = await User.findById(req.user.id).select('role').lean();
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
    }

    await CommunityPlace.findByIdAndDelete(req.params.id);
    res.json({ message: 'Place deleted successfully' });
}));

// ─────────────────────────────────────────────
// POST /api/community/:id/review — one review per user per place
// ─────────────────────────────────────────────
router.post(
    '/:id/review',
    auth,
    requireObjectIdParam('id'),
    rateLimit({ name: 'community-review', windowMs: 60 * 60 * 1000, max: 40 }),
    asyncHandler(async (req, res) => {
        const rating = boundedNumber(req.body.rating, { min: 1, max: 5, fallback: null });
        if (rating === null) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        const place = await CommunityPlace.findById(req.params.id);
        if (!place) return res.status(404).json({ error: 'Place not found' });

        const alreadyReviewed = place.reviews.some(r => String(r.userId) === req.user.id);
        if (alreadyReviewed) {
            return res.status(409).json({ error: 'You have already reviewed this place' });
        }

        place.reviews.push({
            userId: req.user.id,           // identity from the token, not the body
            rating,
            comment: cleanString(req.body.comment, 2000),
            date: new Date(),
        });

        const totalRating = place.reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
        place.rating = totalRating / place.reviews.length;
        place.reviewCount = place.reviews.length;

        await place.save();
        res.json(place);
    })
);

module.exports = router;
