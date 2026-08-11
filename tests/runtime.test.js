/**
 * runtime.test.js — live HTTP checks against the real Express app.
 *
 * Run with:  node tests/runtime.test.js
 *
 * Mongoose model methods are stubbed in-process, so no database is needed. The
 * requests below are the exact attacks from the audit: User B reading User A's
 * data by changing an id, a normal user hitting an admin endpoint, forged
 * payment confirmations, and operator injection in a login body.
 */

process.env.JWT_SECRET = 'runtime-test-secret';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.FRONTEND_URL = 'https://legit-frontend.example.com';
process.env.DISABLE_RATE_LIMIT = 'true';

const path = require('path');
const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const ROOT = path.join(__dirname, '..');

// ── Stub the database layer ─────────────────────────────────────────────────
require(path.join(ROOT, 'db')).connectDB = async () => ({});

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';
const ADMIN = '507f1f77bcf86cd799439013';
const CHAT_OF_A = '607f1f77bcf86cd799439021';
const BOOKING_OF_A = '607f1f77bcf86cd799439022';

const USERS = {
    [USER_A]: { _id: USER_A, role: 'user', username: 'alice', email: 'alice@example.com' },
    [USER_B]: { _id: USER_B, role: 'user', username: 'bob', email: 'bob@example.com' },
    [ADMIN]: { _id: ADMIN, role: 'admin', username: 'root', email: 'root@example.com' },
};

function chainable(value) {
    const chain = {
        populate: () => chain, sort: () => chain, limit: () => chain,
        select: () => chain, lean: () => chain, exec: async () => value,
        then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
    return chain;
}

const User = require(path.join(ROOT, 'models/User'));
User.findById = (id) => chainable(USERS[String(id)] || null);
User.findOne = () => chainable(null);

const Chat = require(path.join(ROOT, 'models/Chat'));
// The saved chat belongs to User A.
Chat.findOne = () => chainable({ _id: CHAT_OF_A, userId: USER_A, title: 'A private chat', save: async () => {} });
Chat.find = () => chainable([]);

const Message = require(path.join(ROOT, 'models/Message'));
Message.find = () => chainable([{ chatId: CHAT_OF_A, sender: 'user', message: 'hello' }]);

const Booking = require(path.join(ROOT, 'models/Booking'));
Booking.findById = () => chainable({
    _id: BOOKING_OF_A, user: USER_A, totalCost: 5000, status: 'Pending',
    payment: {}, save: async () => {}, markModified: () => {},
});
Booking.find = () => chainable([]);
Booking.findByIdAndUpdate = () => chainable({ _id: BOOKING_OF_A, status: 'Cancelled' });
Booking.findByIdAndDelete = () => chainable({ _id: BOOKING_OF_A });

const TravelStory = require(path.join(ROOT, 'models/TravelStory'));
TravelStory.find = () => chainable([]);
TravelStory.findOne = () => chainable(null);
TravelStory.findById = () => chainable({ _id: 'x', userId: USER_A });

const UserPreferences = require(path.join(ROOT, 'models/UserPreferences'));
UserPreferences.findOne = () => chainable({ userId: USER_A, budgetPreference: 'luxury', dietaryPreference: 'veg' });
UserPreferences.findOneAndUpdate = () => chainable({ userId: USER_A });

const Trip = require(path.join(ROOT, 'models/Trip'));
Trip.find = () => chainable([]);
Trip.findById = () => chainable({ _id: 'trip1', userId: 'alice', expenses: [], memories: [], save: async () => {} });

const CommunityPlace = require(path.join(ROOT, 'models/CommunityPlace'));
CommunityPlace.find = () => chainable([]);
CommunityPlace.findById = () => chainable({ _id: 'p1', submittedBy: USER_A });
CommunityPlace.findByIdAndUpdate = () => chainable({ _id: 'p1', isApproved: true });
CommunityPlace.findByIdAndDelete = () => chainable({ _id: 'p1' });

const Payment = require(path.join(ROOT, 'models/Payment'));
Payment.findOne = () => chainable(null);   // no verified payment exists

const Destination = require(path.join(ROOT, 'models/Destination'));
Destination.find = () => chainable([]);
Destination.findById = () => chainable({ _id: 'd1', price: 5000 });

const PaymentOrder = require(path.join(ROOT, 'models/PaymentOrder'));
PaymentOrder.findOne = () => chainable(null);  // unknown order id

mongoose.connect = async () => ({ connection: {} });

// ── Boot the real app ───────────────────────────────────────────────────────
const app = require(path.join(ROOT, 'app'));
const server = http.createServer(app);

function token(userId) {
    return jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function request(method, urlPath, { auth, body, origin } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = {};
        if (payload) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(payload);
        }
        if (auth) headers.Authorization = `Bearer ${auth}`;
        if (origin) headers.Origin = origin;

        const req = http.request({
            host: '127.0.0.1', port: server.address().port, path: urlPath, method, headers,
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

let passed = 0;
const failures = [];

async function check(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  PASS  ${name}`);
    } catch (err) {
        failures.push({ name, message: err.message });
        console.log(`  FAIL  ${name}\n        ${err.message}`);
    }
}

function expectStatus(res, expected, label) {
    const allowed = Array.isArray(expected) ? expected : [expected];
    assert.ok(allowed.includes(res.status),
        `${label}: expected ${allowed.join(' or ')}, got ${res.status} — ${res.body.slice(0, 200)}`);
}

(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));

    const tokenA = token(USER_A);
    const tokenB = token(USER_B);
    const tokenAdmin = token(ADMIN);

    console.log('\n=== Horizontal privilege escalation (User B → User A) ===\n');

    await check("User A reads their own preferences", async () => {
        const res = await request('GET', `/api/preferences/${USER_A}`, { auth: tokenA });
        expectStatus(res, 200, 'own preferences');
    });

    await check("User B is BLOCKED from User A's preferences", async () => {
        const res = await request('GET', `/api/preferences/${USER_A}`, { auth: tokenB });
        expectStatus(res, 403, "cross-user preferences read");
    });

    await check("Unauthenticated access to preferences is BLOCKED", async () => {
        const res = await request('GET', `/api/preferences/${USER_A}`);
        expectStatus(res, 401, 'anonymous preferences read');
    });

    await check("User B is BLOCKED from User A's chat list", async () => {
        const res = await request('GET', `/api/chat/history/${USER_A}`, { auth: tokenB });
        expectStatus(res, 403, 'cross-user chat list');
    });

    await check("User B is BLOCKED from reading User A's chat", async () => {
        const res = await request('GET', `/api/chat/${CHAT_OF_A}`, { auth: tokenB });
        expectStatus(res, 403, 'cross-user chat read');
    });

    await check("User B is BLOCKED from renaming User A's chat", async () => {
        const res = await request('PUT', `/api/chat/rename/${CHAT_OF_A}`, { auth: tokenB, body: { title: 'hacked' } });
        expectStatus(res, 403, 'cross-user chat rename');
    });

    await check("User B is BLOCKED from deleting User A's chat", async () => {
        const res = await request('DELETE', `/api/chat/${CHAT_OF_A}`, { auth: tokenB });
        expectStatus(res, 403, 'cross-user chat delete');
    });

    await check("User A can read their own chat", async () => {
        const res = await request('GET', `/api/chat/${CHAT_OF_A}`, { auth: tokenA });
        expectStatus(res, 200, 'own chat read');
    });

    await check("User B is BLOCKED from User A's travel stories", async () => {
        const res = await request('GET', `/api/stories/user/${USER_A}`, { auth: tokenB });
        expectStatus(res, 403, 'cross-user stories');
    });

    await check("User B is BLOCKED from generating a story for User A's booking", async () => {
        const res = await request('POST', '/api/stories/generate', { auth: tokenB, body: { bookingId: BOOKING_OF_A, userId: USER_A } });
        expectStatus(res, 403, 'cross-user story generation');
    });

    await check("Unauthenticated trip listing is BLOCKED", async () => {
        const res = await request('GET', '/api/trips/user/alice');
        expectStatus(res, 401, 'anonymous trip read');
    });

    await check("User B is BLOCKED from User A's trip", async () => {
        const res = await request('GET', '/api/trips/607f1f77bcf86cd799439031', { auth: tokenB });
        expectStatus(res, 403, 'cross-user trip read');
    });

    await check("User B is BLOCKED from adding an expense to User A's trip", async () => {
        const res = await request('POST', '/api/trips/607f1f77bcf86cd799439031/expense', { auth: tokenB, body: { type: 'food', amount: 10 } });
        expectStatus(res, 403, 'cross-user expense');
    });

    await check("User B is BLOCKED from completing User A's booking", async () => {
        const res = await request('PUT', `/api/bookings/${BOOKING_OF_A}/complete`, { auth: tokenB, body: { totalCost: 1 } });
        expectStatus(res, 403, 'cross-user booking update');
    });

    console.log('\n=== Vertical privilege escalation (user → admin) ===\n');

    await check('Normal user is BLOCKED from listing all bookings', async () => {
        const res = await request('GET', '/api/bookings', { auth: tokenA });
        expectStatus(res, 403, 'user reading all bookings');
    });

    await check('Admin CAN list all bookings', async () => {
        const res = await request('GET', '/api/bookings', { auth: tokenAdmin });
        expectStatus(res, 200, 'admin reading all bookings');
    });

    await check('Normal user is BLOCKED from changing booking status', async () => {
        const res = await request('PUT', `/api/bookings/${BOOKING_OF_A}/status`, { auth: tokenA, body: { status: 'Confirmed' } });
        expectStatus(res, 403, 'user changing status');
    });

    await check('Normal user is BLOCKED from deleting a booking', async () => {
        const res = await request('DELETE', `/api/bookings/${BOOKING_OF_A}`, { auth: tokenA });
        expectStatus(res, 403, 'user deleting booking');
    });

    await check('Normal user is BLOCKED from admin stats', async () => {
        const res = await request('GET', '/api/admin/stats', { auth: tokenA });
        expectStatus(res, 403, 'user reading admin stats');
    });

    await check('Normal user is BLOCKED from the user list', async () => {
        const res = await request('GET', '/api/admin/users', { auth: tokenA });
        expectStatus(res, 403, 'user listing accounts');
    });

    await check('Anonymous approval of community submissions is BLOCKED', async () => {
        const res = await request('PUT', '/api/community/approve/607f1f77bcf86cd799439041');
        expectStatus(res, 401, 'anonymous approve');
    });

    await check('Normal user is BLOCKED from approving submissions', async () => {
        const res = await request('PUT', '/api/community/approve/607f1f77bcf86cd799439041', { auth: tokenA });
        expectStatus(res, 403, 'user approve');
    });

    await check('Normal user is BLOCKED from the pending moderation queue', async () => {
        const res = await request('GET', '/api/community/pending', { auth: tokenA });
        expectStatus(res, 403, 'user reading queue');
    });

    await check('Normal user is BLOCKED from feedback statistics', async () => {
        const res = await request('GET', '/api/feedback/stats', { auth: tokenA });
        expectStatus(res, 403, 'user reading feedback stats');
    });

    await check('Normal user is BLOCKED from creating destinations', async () => {
        const res = await request('POST', '/api/destinations', { auth: tokenA, body: { name: 'x', location: 'y', category: 'beach', description: 'z', imageUrl: 'http://a', price: 1 } });
        expectStatus(res, 403, 'user creating destination');
    });

    await check('Anonymous transport seeding is BLOCKED', async () => {
        const res = await request('POST', '/api/transports/seed', { body: {} });
        expectStatus(res, 401, 'anonymous seed');
    });

    console.log('\n=== Token handling ===\n');

    await check('Malformed token is rejected with 401', async () => {
        const res = await request('GET', '/api/bookings/my', { auth: 'not-a-jwt' });
        expectStatus(res, 401, 'malformed token');
    });

    await check('Token signed with the wrong secret is rejected', async () => {
        const forged = jwt.sign({ user: { id: ADMIN } }, 'attacker-secret');
        const res = await request('GET', '/api/admin/stats', { auth: forged });
        expectStatus(res, 401, 'forged token');
    });

    await check('Expired token is rejected', async () => {
        const expired = jwt.sign({ user: { id: USER_A } }, process.env.JWT_SECRET, { expiresIn: -60 });
        const res = await request('GET', '/api/bookings/my', { auth: expired });
        expectStatus(res, 401, 'expired token');
    });

    await check('A self-declared admin role in the token grants nothing', async () => {
        // USER_A is a normal user in the database; the claim is ignored.
        const escalated = jwt.sign({ user: { id: USER_A, role: 'admin' } }, process.env.JWT_SECRET);
        const res = await request('GET', '/api/admin/stats', { auth: escalated });
        expectStatus(res, 403, 'role claim escalation');
    });

    console.log('\n=== Injection & malformed input ===\n');

    await check('Operator injection in the login body is neutralised', async () => {
        const res = await request('POST', '/api/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
        // Sanitised to an empty object → treated as a missing credential, not a match.
        expectStatus(res, 400, 'operator injection login');
    });

    await check('Invalid ObjectIds are rejected with 400, not a 500', async () => {
        const res = await request('GET', '/api/chat/not-an-object-id', { auth: tokenA });
        expectStatus(res, 400, 'bad object id');
    });

    await check('Path-traversal style ids are rejected', async () => {
        const res = await request('DELETE', '/api/bookings/..%2F..%2Fetc%2Fpasswd', { auth: tokenAdmin });
        expectStatus(res, [400, 404], 'traversal id');
    });

    await check('Unknown API endpoints return a clean 404', async () => {
        const res = await request('GET', '/api/does-not-exist');
        expectStatus(res, 404, 'unknown endpoint');
        assert.ok(!res.body.includes('Cannot GET'), 'default Express page leaked');
    });

    console.log('\n=== Payment integrity ===\n');

    await check('Verification with a forged signature is rejected', async () => {
        const res = await request('POST', '/api/verify-payment', {
            body: { razorpay_order_id: 'order_fake', razorpay_payment_id: 'pay_fake', razorpay_signature: 'deadbeef', amount: 1 },
        });
        expectStatus(res, [400, 503], 'forged signature');
        assert.ok(!res.body.includes('"success":true'), 'forged payment was accepted');
    });

    await check('Verification with no signature is rejected', async () => {
        const res = await request('POST', '/api/verify-payment', { body: { razorpay_order_id: 'order_x' } });
        expectStatus(res, [400, 503], 'missing signature');
    });

    await check('Order creation rejects a non-integer amount', async () => {
        const res = await request('POST', '/api/create-razorpay-order', { body: { amount: 'free' } });
        expectStatus(res, [400, 503], 'invalid amount');
    });

    await check('Order creation rejects an amount below the floor', async () => {
        const res = await request('POST', '/api/create-razorpay-order', { body: { amount: 1 } });
        expectStatus(res, [400, 503], 'sub-minimum amount');
    });

    await check('The Razorpay key endpoint never returns a secret', async () => {
        const res = await request('GET', '/api/get-razorpay-key');
        expectStatus(res, 200, 'key endpoint');
        assert.ok(!res.body.toLowerCase().includes('secret'), 'secret exposed');
    });

    console.log('\n=== CORS ===\n');

    await check('A known origin is allowed', async () => {
        const res = await request('GET', '/api/health', { origin: 'http://localhost:5173' });
        assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173',
            'known origin was not allowed');
    });

    await check('The configured production origin is allowed', async () => {
        const res = await request('GET', '/api/health', { origin: 'https://legit-frontend.example.com' });
        assert.strictEqual(res.headers['access-control-allow-origin'], 'https://legit-frontend.example.com',
            'production origin was not allowed');
    });

    await check('An arbitrary attacker origin is NOT allowed', async () => {
        const res = await request('GET', '/api/health', { origin: 'https://evil.example.com' });
        assert.strictEqual(res.headers['access-control-allow-origin'], undefined,
            'attacker origin received an allow header');
    });

    await check('An arbitrary *.vercel.app origin is NOT allowed', async () => {
        const res = await request('GET', '/api/health', { origin: 'https://attacker-clone.vercel.app' });
        assert.strictEqual(res.headers['access-control-allow-origin'], undefined,
            'any vercel.app origin is still trusted');
    });

    console.log('\n────────────────────────────────────────');
    console.log(`  ${passed} passed, ${failures.length} failed`);
    console.log('────────────────────────────────────────\n');

    server.close();
    if (failures.length) {
        for (const f of failures) console.log(`  ✗ ${f.name}: ${f.message}`);
        process.exit(1);
    }
})();
