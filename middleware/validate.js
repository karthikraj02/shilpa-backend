const mongoose = require('mongoose');

const MAX_STRING_LENGTH = 20000;

/** True when the value is a well-formed Mongo ObjectId. */
function isValidObjectId(id) {
    return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Recursively strips keys that Mongo would interpret as operators ($ prefixed)
 * or as nested paths (containing a dot). This prevents payloads such as
 * { "email": { "$ne": null } } or { "role.admin": true } from reaching a query.
 */
function deepSanitize(value, depth = 0) {
    if (depth > 12) return undefined;

    if (Array.isArray(value)) {
        return value.map((v) => deepSanitize(v, depth + 1));
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const clean = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith('$') || key.includes('.')) continue;
            const sanitized = deepSanitize(value[key], depth + 1);
            if (sanitized !== undefined) clean[key] = sanitized;
        }
        return clean;
    }

    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        return value.slice(0, MAX_STRING_LENGTH);
    }

    return value;
}

/** Express middleware: sanitizes body / query / params on every request. */
function sanitizeRequest(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        const cleanQuery = deepSanitize(req.query);
        // req.query is a getter-only property on Express 5 style setups; assign defensively
        try {
            req.query = cleanQuery;
        } catch (e) {
            for (const key of Object.keys(req.query)) delete req.query[key];
            Object.assign(req.query, cleanQuery);
        }
    }
    if (req.params && typeof req.params === 'object') {
        req.params = deepSanitize(req.params);
    }
    next();
}

/**
 * Route guard factory: rejects the request when the named route param is not a
 * valid ObjectId. Stops malformed IDs from reaching Mongo and from producing
 * 500-level CastErrors that leak internals.
 */
function requireObjectIdParam(...paramNames) {
    return function requireObjectIdParam(req, res, next) {
        for (const name of paramNames) {
            if (!isValidObjectId(req.params[name])) {
                return res.status(400).json({ msg: `Invalid ${name}` });
            }
        }
        next();
    };
}

/**
 * Returns a new object containing ONLY the allowed keys that are actually
 * present in `source`. This is the mass-assignment defence used for every
 * update path in the project.
 */
function pick(source, allowedKeys) {
    const result = {};
    if (!source || typeof source !== 'object') return result;
    for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}

/** Trims and hard-caps a string. Returns '' for non-strings. */
function cleanString(value, maxLength = 500) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

/** Parses a number within bounds, returning `fallback` when invalid. */
function boundedNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = null } = {}) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (num < min || num > max) return fallback;
    return num;
}

/** Parses a date, returning null when invalid or absurdly out of range. */
function safeDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getUTCFullYear();
    if (year < 1900 || year > 2200) return null;
    return d;
}

/** Escapes a user-supplied string so it can be used inside a RegExp safely. */
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    isValidObjectId,
    deepSanitize,
    sanitizeRequest,
    requireObjectIdParam,
    pick,
    cleanString,
    boundedNumber,
    safeDate,
    escapeRegex,
};
