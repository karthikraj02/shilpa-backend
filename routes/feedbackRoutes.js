const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const { createFeedback, getStats } = require('../controllers/feedbackController');

// Anyone may leave feedback (rate limited); only administrators see aggregates.
router.post('/', rateLimit({ name: 'feedback', windowMs: 60 * 60 * 1000, max: 30 }), optionalAuth, createFeedback);
router.get('/stats', adminAuth, getStats);

module.exports = router;
