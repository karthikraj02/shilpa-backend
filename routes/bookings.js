const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const {
    requireObjectIdParam,
    isValidObjectId,
    pick,
    cleanString,
    boundedNumber,
    safeDate,
    escapeRegex,
} = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const Booking = require('../models/Booking');
const Destination = require('../models/Destination');
const Payment = require('../models/Payment');
const { sendReceiptEmail } = require('../services/receiptService');

const MAX_TRAVELERS = 30;
const MAX_TOTAL_COST = 100000000; // ₹10 crore upper sanity bound

const getAgeCategory = (age) => {
    const parsedAge = Number(age);
    if (Number.isNaN(parsedAge)) return 'Adult';
    if (parsedAge >= 12) return 'Adult';
    if (parsedAge >= 5) return 'Child';
    return 'Infant';
};

const getPricingMultiplier = (ageCategory) => {
    if (ageCategory === 'Adult') return 1.0;
    if (ageCategory === 'Child') return 0.5;
    return 0.0;
};

const detectTravelerProfile = (traveler) => {
    const age = Number(traveler.age) || 0;
    const req = traveler.specialRequirements || {};
    if (req.pregnant) return 'Pregnant Traveler';
    if (req.medicalConditionSupport) return 'Medical Condition Support';
    if (req.petTraveler) return 'Pet Traveler';
    if (req.wheelchair || req.accessibleTransport) return 'Differently-Abled Traveler';
    if (req.seniorAssistance || age >= 60) return 'Senior Citizen';
    if (age >= 5 && age < 12) return 'Child';
    if (age < 5) return 'Infant';
    return 'Adult';
};

const computeTravelerType = (travelers) => {
    if (!Array.isArray(travelers) || travelers.length === 0) return 'Solo Traveler';
    const ages = travelers.map(t => Number(t.age) || 0);
    const hasSenior = ages.some(age => age >= 60);
    const hasChild = ages.some(age => age >= 5 && age < 12);
    const hasInfant = ages.some(age => age >= 0 && age < 5);
    if (hasSenior) return 'Senior Citizen';
    if (ages.length === 1) return 'Solo Traveler';
    if (ages.length === 2 && !hasChild && !hasInfant) return 'Couple';
    if (hasChild || hasInfant) return 'Family';
    return 'Group';
};

const buildPricingBreakdown = (basePrice, travelers) => {
    const counts = travelers.reduce((acc, t) => {
        const category = getAgeCategory(t.age);
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    const totalMultipliers = travelers.reduce((sum, t) => sum + getPricingMultiplier(getAgeCategory(t.age)), 0);
    return {
        basePrice,
        adultCount: counts.Adult || 0,
        childCount: counts.Child || 0,
        infantCount: counts.Infant || 0,
        totalMultipliers,
        finalBasePrice: basePrice * totalMultipliers
    };
};

/** Loads a booking and enforces "owner or admin" access. */
async function loadOwnedBooking(req, res) {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        res.status(404).json({ msg: 'Booking not found' });
        return null;
    }
    // Guest bookings (no owner recorded) stay reachable by their id, matching
    // the pre-existing chatbot/checkout flow for non-logged-in travellers.
    if (!booking.user) return booking;

    if (!req.user || String(booking.user) !== req.user.id) {
        res.status(403).json({ msg: 'Access denied' });
        return null;
    }
    return booking;
}

// ─────────────────────────────────────────────
// GET /api/bookings/my — the caller's own bookings
// ─────────────────────────────────────────────
router.get('/my', auth, asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ user: req.user.id })
        .populate('destination')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    res.json(bookings);
}));

// ─────────────────────────────────────────────
// GET /api/bookings — ALL bookings (administrators only)
// ─────────────────────────────────────────────
router.get('/', adminAuth, asyncHandler(async (req, res) => {
    const bookings = await Booking.find()
        .populate('destination')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
    res.json(bookings);
}));

// ─────────────────────────────────────────────
// POST /api/bookings — create (guest or authenticated)
// ─────────────────────────────────────────────
router.post(
    '/',
    rateLimit({ name: 'booking-create', windowMs: 10 * 60 * 1000, max: 40 }),
    optionalAuth,
    asyncHandler(async (req, res) => {
        const body = req.body || {};

        // Only whitelisted booking fields are accepted from the client.
        const payload = pick(body, [
            'name', 'email', 'phone', 'travelDate', 'returnDate', 'numberOfPeople',
            'fromCity', 'toCity', 'adults', 'children', 'aiItinerary', 'destination',
            'transport', 'stay', 'food', 'totalCost', 'travelers', 'travelerType',
            'pricingBreakdown', 'externalBooking', 'pnr', 'bookingReference',
            'ticketData', 'screenshotData', 'flightDetails', 'trainDetails',
            'busDetails', 'hotelDetails', 'review', 'bookingType',
        ]);

        // Ownership always comes from the token, never from the body.
        payload.user = req.user ? req.user.id : undefined;

        const requestedPayment = body.payment && typeof body.payment === 'object' ? body.payment : null;

        // INTERCEPT DYNAMIC AI GENERATED DESTINATIONS
        const destinationObj = body.destinationObj && typeof body.destinationObj === 'object' ? body.destinationObj : null;
        if (typeof payload.destination === 'string' && payload.destination.startsWith('dynamic_') && destinationObj) {
            try {
                const newDest = new Destination({
                    name: cleanString(destinationObj.name || destinationObj.place_name, 200),
                    location: cleanString(destinationObj.location, 200) || 'Global Location',
                    category: ["beach", "mountain", "historical", "cultural", "adventure", "religious", "wildlife"].includes(String(destinationObj.category || '').toLowerCase())
                        ? String(destinationObj.category).toLowerCase()
                        : "historical",
                    description: cleanString(destinationObj.description, 2000) || "Dynamic AI Booking",
                    price: boundedNumber(destinationObj.price, { min: 0, max: MAX_TOTAL_COST, fallback: 5000 }),
                    imageUrl: cleanString(destinationObj.image_url, 1000) || "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1000&auto=format&fit=crop"
                });
                const savedDest = await newDest.save();
                payload.destination = savedDest._id;
            } catch (destErr) {
                if (destErr.code === 11000) {
                    const existingDest = await Destination.findOne({
                        name: { $regex: new RegExp(`^${escapeRegex(destinationObj.name)}$`, 'i') }
                    });
                    if (existingDest) {
                        payload.destination = existingDest._id;
                    } else {
                        return res.status(400).json({ msg: 'Failed to create or find destination' });
                    }
                } else {
                    console.error("Destination creation failed:", destErr.message);
                    return res.status(400).json({ msg: 'Failed to create destination' });
                }
            }
        }

        if (payload.destination && !isValidObjectId(String(payload.destination))) {
            return res.status(400).json({ msg: 'Invalid destination' });
        }

        // Destination price is read from the database, not from the request.
        let destinationPrice = 0;
        if (payload.destination) {
            const destinationData = await Destination.findById(payload.destination).select('price').lean();
            destinationPrice = destinationData?.price || 0;
        }
        if (!destinationPrice && destinationObj?.price) {
            destinationPrice = boundedNumber(destinationObj.price, { min: 0, max: MAX_TOTAL_COST, fallback: 0 });
        }

        if (!Array.isArray(payload.travelers)) {
            payload.travelers = [];
        }
        if (payload.travelers.length > MAX_TRAVELERS) {
            return res.status(400).json({ msg: `A booking may contain at most ${MAX_TRAVELERS} travellers` });
        }

        // Map single form values to travelers array if not already present
        if (payload.travelers.length === 0 && payload.name) {
            payload.travelers.push({
                name: payload.name,
                age: boundedNumber(body.age, { min: 0, max: 120, fallback: 30 }),
                gender: body.gender || 'Male',
                email: payload.email,
                mobile: payload.phone || body.mobile
            });
        }

        // Ensure at least one traveler
        if (payload.travelers.length === 0) {
            payload.travelers.push({
                name: 'Guest Traveler',
                age: 30,
                gender: 'Male',
                email: payload.email || 'guest@travel.com',
                mobile: payload.phone || '0000000000'
            });
        }

        payload.travelers = payload.travelers.map(traveler => {
            const t = traveler && typeof traveler === 'object' ? traveler : {};
            const age = boundedNumber(t.age, { min: 0, max: 120, fallback: 0 });
            const sr = t.specialRequirements && typeof t.specialRequirements === 'object' ? t.specialRequirements : {};
            return {
                name: cleanString(t.name, 120) || 'Traveler',
                age,
                gender: cleanString(t.gender, 30),
                mobile: cleanString(t.mobile, 30),
                email: cleanString(t.email, 200),
                ageCategory: getAgeCategory(age),
                profileType: detectTravelerProfile({ age, specialRequirements: sr }),
                specialRequirements: {
                    wheelchair: !!sr.wheelchair,
                    seniorAssistance: !!sr.seniorAssistance,
                    extraLuggage: !!sr.extraLuggage,
                    mealPreference: cleanString(sr.mealPreference, 60) || 'No Preference',
                    pregnant: !!sr.pregnant,
                    medicalConditionSupport: !!sr.medicalConditionSupport,
                    medicalConditionDetails: cleanString(sr.medicalConditionDetails, 1000),
                    petTraveler: !!sr.petTraveler,
                    accessibleTransport: !!sr.accessibleTransport,
                    emergencySupport: !!sr.emergencySupport
                }
            };
        });

        const travelDate = safeDate(payload.travelDate);
        if (!travelDate) return res.status(400).json({ msg: 'A valid travel date is required' });
        payload.travelDate = travelDate;

        const returnDate = safeDate(payload.returnDate);
        if (returnDate) payload.returnDate = returnDate; else delete payload.returnDate;

        payload.numberOfPeople = boundedNumber(payload.numberOfPeople, { min: 1, max: MAX_TRAVELERS, fallback: payload.travelers.length || 1 });
        payload.travelerType = cleanString(payload.travelerType, 60) || computeTravelerType(payload.travelers);
        payload.pricingBreakdown = payload.pricingBreakdown && typeof payload.pricingBreakdown === 'object'
            ? payload.pricingBreakdown
            : buildPricingBreakdown(destinationPrice, payload.travelers);
        payload.totalCost = boundedNumber(payload.totalCost, { min: 0, max: MAX_TOTAL_COST, fallback: null })
            ?? boundedNumber(payload.pricingBreakdown.finalBasePrice, { min: 0, max: MAX_TOTAL_COST, fallback: 0 });
        payload.name = cleanString(payload.name, 120) || payload.travelers[0]?.name || 'Primary Traveler';
        payload.email = cleanString(payload.email, 200) || payload.travelers[0]?.email || 'guest@travel.com';
        payload.phone = cleanString(payload.phone, 30);

        // ── Payment state is never taken on trust ────────────────────────────
        // A booking may only be created as Confirmed/Success when a matching
        // verified Payment record exists on this server. Otherwise it is stored
        // as Pending, exactly as an unpaid booking would be.
        let verifiedPayment = null;
        const claimedTxn = cleanString(requestedPayment?.transactionId, 120);
        if (claimedTxn && claimedTxn !== 'PENDING') {
            verifiedPayment = await Payment.findOne({
                $or: [{ paymentIntent: claimedTxn }, { sessionId: claimedTxn }],
                status: 'paid',
            }).lean();
        }

        if (verifiedPayment) {
            payload.payment = {
                method: cleanString(requestedPayment.method, 40) || verifiedPayment.method || 'razorpay',
                amount: Number(verifiedPayment.amount || 0) / 100,
                status: 'Success',
                transactionId: verifiedPayment.paymentIntent || claimedTxn,
            };
            payload.status = 'Confirmed';
            payload.bookingStatus = 'Confirmed';
            payload.paymentStatus = 'Success';
        } else {
            if (requestedPayment) {
                payload.payment = {
                    method: cleanString(requestedPayment.method, 40) || 'razorpay',
                    amount: boundedNumber(requestedPayment.amount, { min: 0, max: MAX_TOTAL_COST, fallback: payload.totalCost }),
                    status: 'Pending',
                    transactionId: 'PENDING',
                };
            }
            payload.status = 'Pending';
            payload.bookingStatus = 'Pending';
            payload.paymentStatus = 'Pending';
        }

        const newBooking = new Booking(payload);
        const savedBooking = await newBooking.save();

        if (savedBooking.payment?.status === 'Success' || savedBooking.status === 'Confirmed') {
            sendReceiptEmail(savedBooking).catch(e => console.error('Failed to send receipt email:', e.message));
        }

        res.json(savedBooking);
    })
);

// ─────────────────────────────────────────────
// PUT /api/bookings/:id/provider — mark an official/redirected booking
// ─────────────────────────────────────────────
router.put('/:id/provider', requireObjectIdParam('id'), optionalAuth, asyncHandler(async (req, res) => {
    const booking = await loadOwnedBooking(req, res);
    if (!booking) return;

    booking.providerName = cleanString(req.body.providerName, 200);
    booking.bookingStatus = 'Redirected';
    booking.bookingType = 'Official';
    await booking.save();

    res.json(booking);
}));

// ─────────────────────────────────────────────
// GET /api/bookings/:id — public, redacted view (used by e-mailed review links)
// Full detail is returned only to the owner or an administrator.
// ─────────────────────────────────────────────
router.get('/:id', requireObjectIdParam('id'), optionalAuth, asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('destination');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const isOwner = booking.user && req.user && String(booking.user) === req.user.id;
    const isGuestBooking = !booking.user;

    if (isOwner || isGuestBooking) {
        return res.json(booking);
    }

    // Someone else holding the id gets only what the review page needs —
    // no traveller PII, payment data, tickets or contact details.
    return res.json({
        _id: booking._id,
        destination: booking.destination,
        status: booking.status,
        travelDate: booking.travelDate,
        tripCompleted: booking.tripCompleted,
    });
}));

// ─────────────────────────────────────────────
// GET /api/bookings/:id/status
// ─────────────────────────────────────────────
router.get('/:id/status', requireObjectIdParam('id'), asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('destination').lean();
    if (!booking) return res.status(404).json({ msg: 'Not found' });
    res.json({ status: booking.status, destination: booking.destination });
}));

// ─────────────────────────────────────────────
// PUT /api/bookings/:id/complete — post-booking selections
// Whitelisted fields only; payment status cannot be self-declared.
// ─────────────────────────────────────────────
router.put('/:id/complete', requireObjectIdParam('id'), optionalAuth, asyncHandler(async (req, res) => {
    const booking = await loadOwnedBooking(req, res);
    if (!booking) return;

    const updates = pick(req.body, [
        'transport', 'stay', 'food', 'review', 'totalCost', 'pricingBreakdown',
        'travelers', 'travelerType', 'aiItinerary',
    ]);

    if (updates.totalCost !== undefined) {
        const cost = boundedNumber(updates.totalCost, { min: 0, max: MAX_TOTAL_COST, fallback: null });
        if (cost === null) return res.status(400).json({ msg: 'Invalid total cost' });
        updates.totalCost = cost;
    }

    // The client may name a payment method, but never the payment outcome.
    if (req.body.payment && typeof req.body.payment === 'object') {
        booking.payment = {
            ...(booking.payment || {}),
            method: cleanString(req.body.payment.method, 40) || booking.payment?.method,
            amount: boundedNumber(req.body.payment.amount, { min: 0, max: MAX_TOTAL_COST, fallback: booking.payment?.amount ?? 0 }),
            status: booking.payment?.status || 'Pending',
            transactionId: booking.payment?.transactionId || 'PENDING',
        };
        booking.markModified('payment');
    }

    Object.assign(booking, updates);
    await booking.save();

    res.json(booking);
}));

// ─────────────────────────────────────────────
// PUT /api/bookings/:id/status — administrators only
// ─────────────────────────────────────────────
router.put('/:id/status', requireObjectIdParam('id'), adminAuth, asyncHandler(async (req, res) => {
    const status = cleanString(req.body.status, 30);
    if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ msg: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true }
    );
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    res.json(booking);
}));

// ─────────────────────────────────────────────
// DELETE /api/bookings/:id — administrators only
// ─────────────────────────────────────────────
router.delete('/:id', requireObjectIdParam('id'), adminAuth, asyncHandler(async (req, res) => {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: 'Booking not found' });
    res.json({ msg: 'Booking deleted' });
}));

module.exports = router;
