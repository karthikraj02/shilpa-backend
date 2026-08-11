/**
 * security.test.js — static verification of the project's authorization model.
 *
 * Run with:  node tests/security.test.js
 *
 * This loads the real Express routers and inspects the middleware actually
 * mounted on every route, so it fails if a guard is ever removed. It needs no
 * database and makes no network calls.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-static-route-inspection';

const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  PASS  ${name}`);
    } catch (err) {
        failures.push({ name, message: err.message });
        console.log(`  FAIL  ${name}\n        ${err.message}`);
    }
}

/** Returns the middleware function names mounted on a given method+path. */
function stackFor(router, method, routePath) {
    const layer = router.stack.find(l =>
        l.route && l.route.path === routePath && l.route.methods[method]
    );
    if (!layer) throw new Error(`route ${method.toUpperCase()} ${routePath} not found`);
    return layer.route.stack.map(s => s.name);
}

/** Names of router-level middleware applied to every route (router.use). */
function routerLevel(router) {
    return router.stack.filter(l => !l.route).map(l => l.name);
}

function expectGuard(router, method, routePath, guard) {
    const names = stackFor(router, method, routePath);
    assert.ok(
        names.includes(guard),
        `${method.toUpperCase()} ${routePath} is missing "${guard}" (found: ${names.join(', ') || 'none'})`
    );
}

function expectNoGuard(router, method, routePath, guard) {
    const names = stackFor(router, method, routePath);
    assert.ok(!names.includes(guard), `${method.toUpperCase()} ${routePath} unexpectedly has "${guard}"`);
}

console.log('\n=== Authorization guards ===\n');

// ── Bookings ────────────────────────────────────────────────────────────────
const bookings = require(path.join(ROOT, 'routes/bookings'));
check('GET  /bookings/my requires authentication', () => expectGuard(bookings, 'get', '/my', 'auth'));
check('GET  /bookings (all bookings) is admin-only', () => expectGuard(bookings, 'get', '/', 'adminAuth'));
check('PUT  /bookings/:id/status is admin-only', () => expectGuard(bookings, 'put', '/:id/status', 'adminAuth'));
check('DEL  /bookings/:id is admin-only', () => expectGuard(bookings, 'delete', '/:id', 'adminAuth'));
check('PUT  /bookings/:id/complete identifies the caller', () => expectGuard(bookings, 'put', '/:id/complete', 'optionalAuth'));
check('PUT  /bookings/:id/complete validates the id', () => expectGuard(bookings, 'put', '/:id/complete', 'requireObjectIdParam'));
check('POST /bookings is rate limited', () => expectGuard(bookings, 'post', '/', 'rateLimiter'));

// ── Chat ────────────────────────────────────────────────────────────────────
const chat = require(path.join(ROOT, 'routes/chat'));
for (const [method, route] of [['get', '/history/:userId'], ['get', '/:chatId'], ['post', '/message'],
                               ['put', '/rename/:chatId'], ['delete', '/:chatId'], ['post', '/new']]) {
    check(`${method.toUpperCase().padEnd(4)} /chat${route} requires authentication`,
        () => expectGuard(chat, method, route, 'auth'));
}
check('POST /chat (AI) is rate limited', () => expectGuard(chat, 'post', '/', 'rateLimiter'));

// ── Preferences ─────────────────────────────────────────────────────────────
const prefs = require(path.join(ROOT, 'routes/preferencesRoutes'));
for (const [method, route] of [['get', '/:userId'], ['put', '/:userId'], ['get', '/memory/:userId'], ['post', '/trip']]) {
    check(`${method.toUpperCase().padEnd(4)} /preferences${route} requires authentication`,
        () => expectGuard(prefs, method, route, 'auth'));
}
check('GET  /preferences/:userId enforces self-access', () => expectGuard(prefs, 'get', '/:userId', 'enforceSelf'));
check('PUT  /preferences/:userId enforces self-access', () => expectGuard(prefs, 'put', '/:userId', 'enforceSelf'));

// ── Trips ───────────────────────────────────────────────────────────────────
const trips = require(path.join(ROOT, 'routes/tripsRoutes'));
for (const [method, route] of [['get', '/user/:userId'], ['get', '/:id'], ['post', '/:id/expense'],
                               ['post', '/:id/memory'], ['post', '/import']]) {
    check(`${method.toUpperCase().padEnd(4)} /trips${route} requires authentication`,
        () => expectGuard(trips, method, route, 'auth'));
}

// ── Travel stories ──────────────────────────────────────────────────────────
const stories = require(path.join(ROOT, 'routes/travelStoryRoutes'));
for (const [method, route] of [['post', '/generate'], ['get', '/user/:userId'], ['get', '/:id']]) {
    check(`${method.toUpperCase().padEnd(4)} /stories${route} requires authentication`,
        () => expectGuard(stories, method, route, 'auth'));
}

// ── Community moderation ────────────────────────────────────────────────────
const community = require(path.join(ROOT, 'routes/communityRoutes'));
check('GET  /community/pending is admin-only', () => expectGuard(community, 'get', '/pending', 'adminAuth'));
check('PUT  /community/approve/:id is admin-only', () => expectGuard(community, 'put', '/approve/:id', 'adminAuth'));
check('PUT  /community/reject/:id is admin-only', () => expectGuard(community, 'put', '/reject/:id', 'adminAuth'));
check('DEL  /community/:id requires authentication', () => expectGuard(community, 'delete', '/:id', 'auth'));
check('POST /community/submit requires authentication', () => expectGuard(community, 'post', '/submit', 'auth'));
check('GET  /community/approved stays public', () => expectNoGuard(community, 'get', '/approved', 'auth'));

// ── Catalogue writes ────────────────────────────────────────────────────────
const destinations = require(path.join(ROOT, 'routes/destinations'));
check('POST /destinations is admin-only', () => expectGuard(destinations, 'post', '/', 'adminAuth'));
check('PUT  /destinations/:id is admin-only', () => expectGuard(destinations, 'put', '/:id', 'adminAuth'));
check('DEL  /destinations/:id is admin-only', () => expectGuard(destinations, 'delete', '/:id', 'adminAuth'));
check('GET  /destinations stays public', () => expectNoGuard(destinations, 'get', '/', 'adminAuth'));

const tripPlans = require(path.join(ROOT, 'routes/tripPlans'));
check('POST /tripPlans is admin-only', () => expectGuard(tripPlans, 'post', '/', 'adminAuth'));
check('PUT  /tripPlans/:id is admin-only', () => expectGuard(tripPlans, 'put', '/:id', 'adminAuth'));
check('DEL  /tripPlans/:id is admin-only', () => expectGuard(tripPlans, 'delete', '/:id', 'adminAuth'));

const transports = require(path.join(ROOT, 'routes/transports'));
check('POST /transports/seed is admin-only', () => expectGuard(transports, 'post', '/seed', 'adminAuth'));

// ── Admin router ────────────────────────────────────────────────────────────
const admin = require(path.join(ROOT, 'routes/admin'));
check('every /admin route sits behind adminAuth', () => {
    assert.ok(routerLevel(admin).includes('adminAuth'), 'router-level adminAuth missing');
});

const feedback = require(path.join(ROOT, 'routes/feedbackRoutes'));
check('GET  /feedback/stats is admin-only', () => expectGuard(feedback, 'get', '/stats', 'adminAuth'));

// ── Auth surface ────────────────────────────────────────────────────────────
const authRoutes = require(path.join(ROOT, 'routes/auth'));
for (const route of ['/login', '/register', '/verify-otp', '/resend-otp', '/forgot-password', '/admin-login']) {
    check(`POST /auth${route} is rate limited`, () => expectGuard(authRoutes, 'post', route, 'rateLimiter'));
}

// ── Input handling ──────────────────────────────────────────────────────────
console.log('\n=== Input validation & injection defence ===\n');

const { deepSanitize, isValidObjectId, pick, boundedNumber, escapeRegex, safeDate } =
    require(path.join(ROOT, 'middleware/validate'));

check('Mongo operators are stripped from request objects', () => {
    const dirty = { email: { $ne: null }, password: { $gt: '' }, name: 'ok' };
    const clean = deepSanitize(dirty);
    assert.deepStrictEqual(clean.email, {}, '$ne survived');
    assert.deepStrictEqual(clean.password, {}, '$gt survived');
    assert.strictEqual(clean.name, 'ok', 'legitimate value was lost');
});

check('$where and dotted paths are stripped', () => {
    const clean = deepSanitize({ $where: 'sleep(5000)', 'role.admin': true, keep: 1 });
    assert.ok(!('$where' in clean));
    assert.ok(!('role.admin' in clean));
    assert.strictEqual(clean.keep, 1);
});

check('nested operators inside arrays are stripped', () => {
    const clean = deepSanitize({ list: [{ $ne: 1 }, { ok: 2 }] });
    assert.deepStrictEqual(clean.list[0], {});
    assert.strictEqual(clean.list[1].ok, 2);
});

check('malformed ObjectIds are rejected', () => {
    assert.strictEqual(isValidObjectId('507f1f77bcf86cd799439011'), true);
    assert.strictEqual(isValidObjectId('../../etc/passwd'), false);
    assert.strictEqual(isValidObjectId('abc'), false);
    assert.strictEqual(isValidObjectId(''), false);
});

check('mass assignment is blocked by the whitelist', () => {
    const body = { status: 'Confirmed', role: 'admin', user: 'someone-else', totalCost: 1 };
    const safe = pick(body, ['status', 'totalCost']);
    assert.deepStrictEqual(safe, { status: 'Confirmed', totalCost: 1 });
});

check('numeric bounds reject negative and absurd values', () => {
    assert.strictEqual(boundedNumber(-50, { min: 0, max: 100, fallback: null }), null);
    assert.strictEqual(boundedNumber(1e12, { min: 0, max: 100, fallback: null }), null);
    assert.strictEqual(boundedNumber('42', { min: 0, max: 100, fallback: null }), 42);
    assert.strictEqual(boundedNumber('abc', { min: 0, max: 100, fallback: null }), null);
});

check('regex metacharacters from user input are escaped', () => {
    const escaped = escapeRegex('.*(a+)+$');
    assert.ok(!/[^\\]\*/.test(escaped), 'unescaped quantifier survived');
    assert.doesNotThrow(() => new RegExp(`^${escaped}$`));
});

check('invalid dates are rejected', () => {
    assert.strictEqual(safeDate('not-a-date'), null);
    assert.strictEqual(safeDate('1400-01-01'), null);
    assert.ok(safeDate('2026-05-01') instanceof Date);
});

// ── Rate limiter behaviour ──────────────────────────────────────────────────
const rateLimit = require(path.join(ROOT, 'middleware/rateLimit'));

check('rate limiter allows the quota then returns 429', () => {
    const limiter = rateLimit({ name: `unit-${Date.now()}`, windowMs: 60000, max: 3 });
    const req = { headers: {}, ip: '10.0.0.1', socket: {} };
    let status = 200, calls = 0;
    const res = {
        setHeader() {},
        status(c) { status = c; return this; },
        json() { return this; },
    };
    for (let i = 0; i < 3; i++) limiter(req, res, () => calls++);
    assert.strictEqual(calls, 3, 'requests within quota were blocked');
    limiter(req, res, () => calls++);
    assert.strictEqual(status, 429, 'over-quota request was not rejected');
    assert.strictEqual(calls, 3, 'over-quota request reached the handler');
});

// ── Error handler ───────────────────────────────────────────────────────────
const { errorHandler } = require(path.join(ROOT, 'middleware/errorHandler'));

check('internal error details never reach the client', () => {
    const err = new Error('E11000 duplicate key error collection: tourist_assistant.users index: email_1');
    err.stack = 'at /home/deploy/backend/routes/auth.js:120';
    let body = null, status = null;
    const res = {
        headersSent: false,
        status(c) { status = c; return this; },
        json(payload) { body = payload; return this; },
    };
    errorHandler(err, { method: 'POST', originalUrl: '/api/test' }, res, () => {});
    assert.strictEqual(status, 500);
    assert.ok(!JSON.stringify(body).includes('E11000'), 'Mongo error text leaked');
    assert.ok(!JSON.stringify(body).includes('/home/deploy'), 'filesystem path leaked');
});

check('validation errors map to 422, cast errors to 400, duplicates to 409', () => {
    const cases = [
        [Object.assign(new Error('v'), { name: 'ValidationError' }), 422],
        [Object.assign(new Error('c'), { name: 'CastError' }), 400],
        [Object.assign(new Error('d'), { code: 11000 }), 409],
        [Object.assign(new Error('j'), { name: 'TokenExpiredError' }), 401],
    ];
    for (const [err, expected] of cases) {
        let status = null;
        const res = { headersSent: false, status(c) { status = c; return this; }, json() { return this; } };
        errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, () => {});
        assert.strictEqual(status, expected, `expected ${expected}, got ${status}`);
    }
});

// ── CORS policy ─────────────────────────────────────────────────────────────
console.log('\n=== CORS policy ===\n');

check('unknown origins are rejected, known ones allowed', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(!/return callback\(null, true\);\s*\n\s*\},\s*\n\s*credentials/.test(src),
        'blanket allow-all fallback still present');
    assert.ok(src.includes('isOriginAllowed'), 'origin allow-list helper missing');
    assert.ok(src.includes("console.warn('[cors] Blocked origin:'"), 'blocked origins are not logged');
});

// ── Secrets ─────────────────────────────────────────────────────────────────
console.log('\n=== Secret hygiene ===\n');

check('no hardcoded admin password remains in createAdmin.js', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'createAdmin.js'), 'utf8');
    assert.ok(!src.includes("'Admin@123'"), 'hardcoded password still present');
    assert.ok(src.includes('process.env.ADMIN_PASSWORD'), 'password is not read from the environment');
});

check('the Razorpay secret is never sent to the browser', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const keyRoute = src.slice(src.indexOf("app.get('/api/get-razorpay-key'"));
    const routeBody = keyRoute.slice(0, keyRoute.indexOf('});'));
    assert.ok(!routeBody.includes('RAZORPAY_KEY_SECRET'), 'key secret exposed on the public key endpoint');
});

// ── Payment trust chain ─────────────────────────────────────────────────────
console.log('\n=== Payment trust chain ===\n');

check('the verified amount comes from the stored order, not the request body', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const verify = src.slice(src.indexOf("app.post('/api/verify-payment'"));
    assert.ok(verify.includes('PaymentOrder.findOne({ razorpayOrderId })'), 'stored order is not looked up');
    assert.ok(verify.includes('trustedAmount'), 'a server-side amount is not used');
    assert.ok(!/amount: Number\(req\.body\.amount\)/.test(verify), 'client amount is still persisted');
    assert.ok(verify.includes('timingSafeEqual'), 'signature comparison is not constant time');
});

check('order creation prices a booking from the database', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const create = src.slice(src.indexOf("app.post('/api/create-razorpay-order'"));
    assert.ok(create.includes('Booking.findById(bookingId)'), 'booking is not re-priced server side');
    assert.ok(create.includes('Payment amount does not match the booking total'), 'amount mismatch is not rejected');
    assert.ok(create.includes('You are not allowed to pay for this booking'), 'booking ownership is not checked');
});

check('bookings cannot be self-declared as paid', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'routes/bookings.js'), 'utf8');
    assert.ok(src.includes("status: 'paid'"), 'no verified-payment lookup before confirming');
    assert.ok(src.includes("payload.status = 'Pending'"), 'unverified bookings are not downgraded to Pending');
    assert.ok(!src.includes('$set: req.body'), 'raw body is still written to Mongo');
});

// ── Legacy vulnerability patterns ───────────────────────────────────────────
console.log('\n=== Legacy vulnerable patterns ===\n');

const fs = require('fs');
function sourceFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'tests') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...sourceFiles(full));
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

const backendSources = sourceFiles(ROOT).filter(f =>
    /\/(routes|controllers|middleware|models)\//.test(f) || f.endsWith('app.js')
);

check('no route reads an identity from req.params.userId for a query', () => {
    const offenders = backendSources.filter(f => {
        const src = fs.readFileSync(f, 'utf8');
        return /findOne\(\s*\{\s*userId:\s*req\.params\.userId/.test(src)
            || /find\(\s*\{\s*userId:\s*req\.params\.userId/.test(src);
    });
    assert.deepStrictEqual(offenders.map(f => path.relative(ROOT, f)), []);
});

check('no route trusts req.body.userId / req.body.username as identity', () => {
    const offenders = backendSources.filter(f => {
        const src = fs.readFileSync(f, 'utf8');
        return /userId:\s*req\.body\.userId/.test(src) || /username:\s*req\.body\.username/.test(src);
    });
    assert.deepStrictEqual(offenders.map(f => path.relative(ROOT, f)), []);
});

check('no findByIdAndUpdate writes the raw request body', () => {
    const offenders = backendSources.filter(f => {
        const src = fs.readFileSync(f, 'utf8');
        // Flags the raw body used *as* the update document. Calls that wrap it in
        // pick(...) or $set: pick(...) are the sanitized form and are allowed.
        return /findByIdAndUpdate\([^,]+,\s*req\.body/.test(src)
            || /\$set:\s*req\.body\b/.test(src)
            || /updateOne\([^,]+,\s*req\.body/.test(src)
            || /new\s+\w+\(req\.body\)/.test(src);
    });
    assert.deepStrictEqual(offenders.map(f => path.relative(ROOT, f)), []);
});

check('no unescaped user input is compiled into a RegExp', () => {
    const offenders = backendSources.filter(f => {
        const src = fs.readFileSync(f, 'utf8');
        return /new RegExp\(`\^\$\{(?!escapeRegex)/.test(src);
    });
    assert.deepStrictEqual(offenders.map(f => path.relative(ROOT, f)), []);
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n────────────────────────────────────────');
console.log(`  ${passed} passed, ${failures.length} failed`);
console.log('────────────────────────────────────────\n');

if (failures.length) {
    for (const f of failures) console.log(`  ✗ ${f.name}: ${f.message}`);
    process.exit(1);
}
