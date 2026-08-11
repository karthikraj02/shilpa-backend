const Trip = require('../models/Trip');
const User = require('../models/User');
const { cleanString, boundedNumber, safeDate } = require('../middleware/validate');

/**
 * Trip.userId is a free-form String in this project: historically the frontend
 * stored the *username* there. To stay compatible with existing documents while
 * still being safe, every lookup is scoped to the set of identifiers that
 * provably belong to the authenticated user (id, username, email).
 */
async function identityKeys(req) {
    const user = await User.findById(req.user.id).select('username email').lean();
    const keys = [req.user.id];
    if (user?.username) keys.push(user.username);
    if (user?.email) keys.push(user.email);
    return { keys, preferred: user?.username || req.user.id };
}

const createImportedBooking = async (req, res, next) => {
    try {
        const { preferred } = await identityKeys(req);

        const trip = await Trip.create({
            // Ownership comes from the token; req.body.userId is ignored.
            userId: preferred,
            bookingProvider: cleanString(req.body.bookingProvider, 120),
            bookingId: cleanString(req.body.bookingId, 120),
            bookingScreenshot: cleanString(req.body.bookingScreenshot, 2_000_000),
            travelDate: safeDate(req.body.travelDate),
            destination: cleanString(req.body.destination, 200),
            transportDetails: typeof req.body.transportDetails === 'object' && req.body.transportDetails !== null ? req.body.transportDetails : {},
            hotelDetails: typeof req.body.hotelDetails === 'object' && req.body.hotelDetails !== null ? req.body.hotelDetails : {},
            budgetPlanned: boundedNumber(req.body.budgetPlanned, { min: 0, max: 100000000, fallback: 0 }),
        });
        return res.json({ success: true, trip });
    } catch (err) {
        return next(err);
    }
};

const getUserTrips = async (req, res, next) => {
    try {
        const { keys } = await identityKeys(req);
        // The :userId path param is ignored — results are always the caller's.
        const trips = await Trip.find({ userId: { $in: keys } })
            .sort({ travelDate: -1 })
            .limit(200)
            .lean();
        return res.json(trips);
    } catch (err) {
        return next(err);
    }
};

/** Loads a trip and returns it only if the caller owns it. */
async function loadOwnedTrip(req, res) {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return null;
    }
    const { keys } = await identityKeys(req);
    if (!keys.includes(String(trip.userId))) {
        res.status(403).json({ error: 'Access denied' });
        return null;
    }
    return trip;
}

const getTripById = async (req, res, next) => {
    try {
        const trip = await loadOwnedTrip(req, res);
        if (!trip) return;
        return res.json(trip);
    } catch (err) {
        return next(err);
    }
};

const addExpense = async (req, res, next) => {
    try {
        const trip = await loadOwnedTrip(req, res);
        if (!trip) return;

        const amount = boundedNumber(req.body.amount, { min: 0, max: 100000000, fallback: null });
        if (amount === null) return res.status(400).json({ error: 'Invalid expense amount' });

        if (trip.expenses.length >= 500) {
            return res.status(409).json({ error: 'Expense limit reached for this trip' });
        }

        trip.expenses.push({
            type: cleanString(req.body.type, 60),
            amount,
            currency: cleanString(req.body.currency, 10) || 'INR',
            note: cleanString(req.body.note, 500),
        });
        await trip.save();
        return res.json({ success: true, trip });
    } catch (err) {
        return next(err);
    }
};

const addMemory = async (req, res, next) => {
    try {
        const trip = await loadOwnedTrip(req, res);
        if (!trip) return;

        const image = req.body.imageBase64;
        if (typeof image !== 'string' || !image) {
            return res.status(400).json({ error: 'An image is required' });
        }
        // Accept data-URI images and http(s) URLs only — no javascript:/file: URIs.
        const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(image);
        const isHttpUrl = /^https?:\/\//i.test(image);
        if (!isDataImage && !isHttpUrl) {
            return res.status(400).json({ error: 'Unsupported image format' });
        }
        if (image.length > 5_000_000) {
            return res.status(413).json({ error: 'Image is too large (max ~5MB)' });
        }
        if (trip.memories.length >= 100) {
            return res.status(409).json({ error: 'Memory limit reached for this trip' });
        }

        trip.memories.push(image);
        await trip.save();
        return res.json({ success: true, trip });
    } catch (err) {
        return next(err);
    }
};

module.exports = { createImportedBooking, getUserTrips, getTripById, addExpense, addMemory };
