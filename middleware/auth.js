const jwt = require('jsonwebtoken');

/**
 * Standard authentication: any logged-in user.
 *
 * Always produces a consistent shape:
 *   req.user = { id, role }
 *
 * Ownership decisions elsewhere in the project rely on req.user.id, which is
 * derived from the signed token only — never from a URL parameter or body field.
 */
module.exports = function auth(req, res, next) {
    const authHeader = req.header('Authorization') || req.header('x-auth-token');
    if (!authHeader) return res.status(401).json({ msg: 'No token, authorization denied' });

    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('[auth] JWT_SECRET is not configured');
        return res.status(500).json({ msg: 'Server misconfigured' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.user || !decoded.user.id) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }
        req.user = {
            id: String(decoded.user.id),
            role: decoded.user.role || 'user',
        };
        return next();
    } catch (err) {
        // Expired and malformed tokens are reported identically.
        return res.status(401).json({ msg: 'Token is not valid' });
    }
};
