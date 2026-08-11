const auth = require('./auth');
const User = require('../models/User');

/**
 * Administrator-only guard.
 *
 * Runs the standard authentication first, then re-checks the role against the
 * database rather than trusting the role claim inside the token. A user demoted
 * after their token was issued loses admin access immediately.
 */
module.exports = function adminAuth(req, res, next) {
    auth(req, res, async () => {
        try {
            const user = await User.findById(req.user.id).select('role email').lean();
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ msg: 'Access denied: Admins only' });
            }
            req.user.role = 'admin';
            req.user.email = user.email;
            return next();
        } catch (err) {
            console.error('[adminAuth] Role check failed:', err.message);
            return res.status(500).json({ msg: 'Server error' });
        }
    });
};
