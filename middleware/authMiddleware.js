const auth = require('./auth');
const adminAuth = require('./adminAuth');
const optionalAuth = require('./optionalAuth');

/**
 * Compatibility shim.
 *
 * `middleware/auth.js` is the single implementation; this file only re-exports
 * it under the names some older imports used, so nothing breaks while the
 * codebase converges on one import path.
 */
module.exports = {
    verifyToken: auth,
    auth,
    adminAuth,
    optionalAuth,
};
