const jwt = require('jsonwebtoken');

/**
 * Optional authentication.
 * If a valid Bearer token is present, req.user = { id } is populated.
 * If absent/invalid, the request continues as a guest (req.user = null).
 *
 * Used by endpoints that must keep working for guests (booking creation,
 * review submission, chat, emergency) but should still bind the record to a
 * real user when one is logged in.
 */
module.exports = function optionalAuth(req, res, next) {
    req.user = null;

    const authHeader = req.header('Authorization') || req.header('x-auth-token');
    if (!authHeader) return next();

    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (!token || token === 'null' || token === 'undefined') return next();

    if (!process.env.JWT_SECRET) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.user && decoded.user.id) {
            req.user = { id: String(decoded.user.id) };
        }
    } catch (err) {
        // Invalid/expired token → treat as guest, never leak the reason
    }
    return next();
};
