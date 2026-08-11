const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Destination = require('../models/Destination');
const Review = require('../models/Review');
const Transport = require('../models/Transport');
const CommunityPlace = require('../models/CommunityPlace');
const adminAuth = require('../middleware/adminAuth');
const { requireObjectIdParam, pick, cleanString, boundedNumber } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes in this file are admin-protected
router.use(adminAuth);

const DESTINATION_FIELDS = [
    'name', 'location', 'category', 'description', 'price', 'imageUrl', 'heroImageUrl',
    'rating', 'estimatedBudget', 'image_gallery', 'best_time', 'weather', 'distance',
    'attractions', 'hotels', 'transport_options', 'budgets', 'travel_tips',
    'safety_tips', 'nearby_attractions', 'foods', 'itinerary_1_day', 'itinerary_2_day',
    'itinerary_3_day',
];

const TRANSPORT_FIELDS = [
    'type', 'name', 'number', 'from', 'to', 'fromStation', 'toStation', 'departureTime',
    'arrivalTime', 'duration', 'price', 'availableSeats', 'rating', 'logo', 'flightType',
    'airline', 'busType', 'acType', 'seatType', 'boardingPoint', 'platform', 'coachType',
];

// ─────────────────────────────────────────────
// GET /api/admin/stats — dashboard overview numbers
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalBookings, totalDestinations, totalReviews] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Booking.countDocuments(),
            Destination.countDocuments(),
            Review.countDocuments(),
        ]);

        const revenueAgg = await Booking.aggregate([
            { $group: { _id: null, total: { $sum: '$totalCost' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        res.json({ totalUsers, totalBookings, totalDestinations, totalRevenue, totalReviews });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ msg: 'Failed to fetch stats' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/analytics — usage analytics
// ─────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
    try {
        // Bookings by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [bookingsByMonth, usersByMonth, topDestinations] = await Promise.all([
            Booking.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo } } },
                { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$totalCost' } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            User.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, role: 'user' } },
                { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Booking.aggregate([
                { $group: { _id: '$destination', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
        ]);

        res.json({ bookingsByMonth, usersByMonth, topDestinations });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ msg: 'Failed to fetch analytics' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/users — list all users
// ─────────────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('-password -resetPasswordToken -resetPasswordExpires -otp -otpExpires')
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch users' });
    }
});

// DELETE /api/admin/users/:id — remove a user
router.delete('/users/:id', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ msg: 'You cannot delete your own account' });
    }
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted' });
}));

// PATCH /api/admin/users/:id/role — change user role
router.patch('/users/:id/role', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const role = cleanString(req.body.role, 20);
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ msg: 'Invalid role' });
    }
    if (req.params.id === req.user.id && role !== 'admin') {
        return res.status(400).json({ msg: 'You cannot remove your own admin role' });
    }
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { role } },
        { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -otp -otpExpires');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
}));

// ─────────────────────────────────────────────
// GET /api/admin/bookings — all bookings
// ─────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().populate('destination').sort({ createdAt: -1 }).limit(100);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch bookings' });
    }
});

// PATCH /api/admin/bookings/:id/status — update booking status
router.patch('/bookings/:id/status', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const status = cleanString(req.body.status, 30);
    if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    res.json(booking);
}));

// DELETE /api/admin/bookings/:id
router.delete('/bookings/:id', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'Booking not found' });
    res.json({ msg: 'Booking deleted' });
}));

// ─────────────────────────────────────────────
// GET /api/admin/destinations
// ─────────────────────────────────────────────
router.get('/destinations', async (req, res) => {
    try {
        const destinations = await Destination.find().sort({ createdAt: -1 });
        res.json(destinations);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch destinations' });
    }
});

// POST /api/admin/destinations
router.post('/destinations', async (req, res) => {
    try {
        const dest = new Destination(pick(req.body, DESTINATION_FIELDS));
        await dest.save();
        res.status(201).json(dest);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to create destination' });
    }
});

// PATCH /api/admin/destinations/:id
router.patch('/destinations/:id', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const dest = await Destination.findByIdAndUpdate(
        req.params.id,
        { $set: pick(req.body, DESTINATION_FIELDS) },
        { new: true, runValidators: true }
    );
    if (!dest) return res.status(404).json({ msg: 'Destination not found' });
    res.json(dest);
}));

// DELETE /api/admin/destinations/:id
router.delete('/destinations/:id', requireObjectIdParam('id'), async (req, res) => {
    try {
        await Destination.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Destination deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete destination' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/reviews — manage reviews
// ─────────────────────────────────────────────
router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }).limit(200);
        
        // Fetch destinations and transports to map IDs to names
        const [destinations, transports] = await Promise.all([
            Destination.find({}, 'name'),
            Transport.find({}, 'name')
        ]);

        const destMap = {};
        destinations.forEach(d => { destMap[d._id.toString()] = d.name; });

        const transMap = {};
        transports.forEach(t => { transMap[t._id.toString()] = t.name; });

        const enrichedReviews = reviews.map(r => {
            const reviewObj = r.toObject();
            let placeName = '—';
            if (reviewObj.destinationId && destMap[reviewObj.destinationId]) {
                placeName = `Destination: ${destMap[reviewObj.destinationId]}`;
            } else if (reviewObj.transportId && transMap[reviewObj.transportId]) {
                placeName = `Transport: ${transMap[reviewObj.transportId]}`;
            } else if (reviewObj.hotelId) {
                placeName = `Hotel: ${reviewObj.hotelId}`;
            }
            reviewObj.placeName = placeName;
            return reviewObj;
        });

        res.json(enrichedReviews);
    } catch (err) {
        console.error('Failed to fetch admin reviews:', err);
        res.status(500).json({ msg: 'Failed to fetch reviews' });
    }
});

// PATCH /api/admin/reviews/:id/approve
router.patch('/reviews/:id/approve', requireObjectIdParam('id'), async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
        res.json(review);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to approve review' });
    }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireObjectIdParam('id'), async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete review' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/transports — manage transports
// ─────────────────────────────────────────────
router.get('/transports', async (req, res) => {
    try {
        const transports = await Transport.find().sort({ createdAt: -1 });
        res.json(transports);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch transports' });
    }
});

// POST /api/admin/transports
router.post('/transports', async (req, res) => {
    try {
        const transport = new Transport(pick(req.body, TRANSPORT_FIELDS));
        await transport.save();
        res.status(201).json(transport);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to create transport' });
    }
});

// PATCH /api/admin/transports/:id
router.patch('/transports/:id', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const transport = await Transport.findByIdAndUpdate(
        req.params.id,
        { $set: pick(req.body, TRANSPORT_FIELDS) },
        { new: true, runValidators: true }
    );
    if (!transport) return res.status(404).json({ msg: 'Transport not found' });
    res.json(transport);
}));

// DELETE /api/admin/transports/:id
router.delete('/transports/:id', requireObjectIdParam('id'), async (req, res) => {
    try {
        await Transport.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Transport deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete transport' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/hidden-gems — community places pending approval
// ─────────────────────────────────────────────
router.get('/hidden-gems', async (req, res) => {
    try {
        const gems = await CommunityPlace.find()
            .populate('submittedBy', 'name username')
            .sort({ createdAt: -1 });
        res.json(gems);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch hidden gems' });
    }
});

// PATCH /api/admin/hidden-gems/:id/approve
router.patch('/hidden-gems/:id/approve', requireObjectIdParam('id'), async (req, res) => {
    try {
        const gem = await CommunityPlace.findByIdAndUpdate(
            req.params.id,
            { status: 'approved', isApproved: true, approvedAt: new Date() },
            { new: true }
        ).populate('submittedBy', 'name username');
        res.json(gem);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to approve hidden gem' });
    }
});

// PATCH /api/admin/hidden-gems/:id/reject
router.patch('/hidden-gems/:id/reject', requireObjectIdParam('id'), async (req, res) => {
    try {
        const gem = await CommunityPlace.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', isApproved: false },
            { new: true }
        ).populate('submittedBy', 'name username');
        res.json(gem);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to reject hidden gem' });
    }
});

// DELETE /api/admin/hidden-gems/:id
router.delete('/hidden-gems/:id', requireObjectIdParam('id'), async (req, res) => {
    try {
        await CommunityPlace.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Hidden gem deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete hidden gem' });
    }
});

// ─────────────────────────────────────────────
// GET /api/admin/recent-activity
// ─────────────────────────────────────────────
router.get('/recent-activity', async (req, res) => {
    try {
        const [recentUsers, recentBookings] = await Promise.all([
            User.find({ role: 'user' }).select('name email createdAt profilePicture').sort({ createdAt: -1 }).limit(5),
            Booking.find().select('name totalCost createdAt status').sort({ createdAt: -1 }).limit(5),
        ]);
        res.json({ recentUsers, recentBookings });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch recent activity' });
    }
});

module.exports = router;
