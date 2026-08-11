/**
 * Minimal in-process rate limiter.
 *
 * Implemented in-house rather than pulling in `express-rate-limit` so that the
 * dependency list is unchanged. Counters live in module scope (shared across
 * requests in a warm process). On serverless platforms each cold instance keeps
 * its own window, which still blunts scripted abuse against a single instance.
 */

const buckets = new Map();
let lastSweep = Date.now();

function sweep(now) {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(key);
    }
}

function clientKey(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '')
        || req.ip
        || req.socket?.remoteAddress
        || 'unknown';
    // Authenticated users get their own bucket so shared NATs don't collide.
    return req.user?.id ? `u:${req.user.id}` : `ip:${ip}`;
}

/**
 * @param {object} options
 * @param {number} options.windowMs  Window length in milliseconds.
 * @param {number} options.max       Allowed requests per window.
 * @param {string} options.name      Bucket namespace (keeps routes independent).
 * @param {string} [options.message] Client-facing message.
 */
function rateLimit({ windowMs = 60_000, max = 60, name = 'default', message } = {}) {
    return function rateLimiter(req, res, next) {
        if (process.env.DISABLE_RATE_LIMIT === 'true') return next();

        const now = Date.now();
        sweep(now);

        const key = `${name}:${clientKey(req)}`;
        let entry = buckets.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            buckets.set(key, entry);
        }

        entry.count += 1;

        const remaining = Math.max(0, max - entry.count);
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(remaining));

        if (entry.count > max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({
                msg: message || 'Too many requests. Please slow down and try again shortly.',
            });
        }

        return next();
    };
}

module.exports = rateLimit;
