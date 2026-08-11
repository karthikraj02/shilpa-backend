const EmergencyLog = require('../models/EmergencyLog');
const { generateResponse } = require('../services/EmergencyAssistanceService');
const { cleanString, boundedNumber, isValidObjectId } = require('../middleware/validate');

async function handleEmergency(req, res, next) {
  try {
    const query = cleanString(req.body.query, 2000);
    if (!query) return res.status(400).json({ success: false, error: 'Please describe the problem.' });

    const lat = boundedNumber(req.body.lat, { min: -90, max: 90, fallback: null });
    const lng = boundedNumber(req.body.lng, { min: -180, max: 180, fallback: null });

    const rawTripId = typeof req.body.tripId === 'string' ? req.body.tripId : '';
    const tripId = isValidObjectId(rawTripId) ? rawTripId : undefined;

    // Identity comes from optionalAuth (verified token) rather than a manual decode.
    const userId = req.user ? req.user.id : null;

    const { aiResponse, type, nearby } = await generateResponse({ query, lat, lng });

    const log = new EmergencyLog({
      user: userId,
      query,
      aiResponse,
      location: (lat !== null && lng !== null) ? { lat, lng } : undefined,
      tripId,
      meta: { type, nearby }
    });
    await log.save();

    res.json({ success: true, type, aiResponse, nearby });
  } catch (err) {
    return next(err);
  }
}

module.exports = { handleEmergency };
