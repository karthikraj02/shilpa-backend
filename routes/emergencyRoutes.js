const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const { handleEmergency } = require('../controllers/emergencyController');

// Kept open to guests on purpose — this is a safety feature — but the caller is
// identified from a token when one is present, and abuse is rate limited.
router.post('/', rateLimit({ name: 'emergency', windowMs: 60 * 1000, max: 20 }), optionalAuth, handleEmergency);

module.exports = router;
