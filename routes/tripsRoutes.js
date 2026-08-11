const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { requireObjectIdParam } = require('../middleware/validate');
const {
    createImportedBooking,
    getUserTrips,
    getTripById,
    addExpense,
    addMemory,
} = require('../controllers/tripsController');

// Every trip route requires a logged-in user; ownership is enforced inside the
// controller against the authenticated identity, never against the URL.
router.post('/import', auth, rateLimit({ name: 'trip-import', windowMs: 10 * 60 * 1000, max: 30 }), createImportedBooking);
router.get('/user/:userId', auth, getUserTrips);
router.get('/:id', auth, requireObjectIdParam('id'), getTripById);
router.post('/:id/expense', auth, requireObjectIdParam('id'), addExpense);
router.post('/:id/memory', auth, requireObjectIdParam('id'), addMemory);

module.exports = router;
