try {
  require('dotenv').config();
} catch (_) {
  /* Vercel injects env vars; dotenv optional when bundled */
}

const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const Payment = require('./models/Payment');
const PaymentOrder = require('./models/PaymentOrder');
const Booking = require('./models/Booking');
const { connectDB } = require('./db');
const optionalAuth = require('./middleware/optionalAuth');
const rateLimit = require('./middleware/rateLimit');
const { sanitizeRequest, isValidObjectId, cleanString } = require('./middleware/validate');
const { asyncHandler, errorHandler, notFound } = require('./middleware/errorHandler');
require('./services/reviewCron'); // Initialize the automated review email service
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─────────────────────────────────────────────
// CORS — explicit allow-list, no blanket approval
// ─────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ...(process.env.ADDITIONAL_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
].filter(Boolean);

// Preview deployments of this project only (never every *.vercel.app site).
const previewOriginPattern = process.env.VERCEL_PREVIEW_PATTERN
  ? new RegExp(process.env.VERCEL_PREVIEW_PATTERN)
  : /^https:\/\/m-sc-final-year-project[a-z0-9-]*\.vercel\.app$/;

function isOriginAllowed(origin) {
  if (allowedOrigins.includes(origin)) return true;
  return previewOriginPattern.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    // Same-origin / server-to-server / curl requests carry no Origin header.
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    console.warn('[cors] Blocked origin:', origin);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.static('public'));
app.use(bodyParser.json({ limit: '10mb' }));

// Strip Mongo operators ($ne, $gt, $where, dotted paths) from every request.
app.use(sanitizeRequest);

app.get('/', (req, res) => {
  res.send('MSc Final Year Project Backend is running!');
});

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    console.error('Health check DB error:', err.message);
    res.status(503).json({ ok: false, database: 'disconnected' });
  }
});

// Reuse the cached Mongo connection (see db.js) on every request.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(503).json({ msg: 'Database unavailable. Please try again shortly.' });
  }
});

app.use('/api/chat', require('./routes/chat'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/destinations', require('./routes/destinations'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/transports', require('./routes/transports'));
app.use('/api/tripPlans', require('./routes/tripPlans'));
app.use('/api/preferences', require('./routes/preferencesRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/stories', require('./routes/travelStoryRoutes'));
app.use('/api/nearby', require('./routes/nearbyRoutes'));
app.use('/api/safety', require('./routes/safetyRoutes'));
app.use('/api/emergency', require('./routes/emergencyRoutes'));
app.use('/api/trips', require('./routes/tripsRoutes'));
// admin routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/feedbackRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

// ─────────────────────────────────────────────
// Payments (Razorpay)
// ─────────────────────────────────────────────
let razorpayInstance = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const err = new Error('Payment service is not configured');
    err.status = 503;
    err.expose = true;
    throw err;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

function validateAmount(amount) {
  return Number.isInteger(amount) && amount >= 100 && amount <= 1000000000;
}

const paymentLimiter = rateLimit({
  name: 'payment',
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many payment attempts. Please wait a few minutes and try again.',
});

/**
 * Create a Razorpay order.
 *
 * When the caller supplies a bookingId, the payable amount is taken from the
 * booking stored in MongoDB and the client-supplied amount is only accepted if
 * it matches. Either way the expected amount is persisted in PaymentOrder so
 * verification never has to trust the browser.
 */
app.post('/api/create-razorpay-order', paymentLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const razorpay = getRazorpay();
  let amount = Number(req.body.amount);
  const bookingId = typeof req.body.bookingId === 'string' ? req.body.bookingId : null;
  let booking = null;

  if (bookingId) {
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking reference.' });
    }
    booking = await Booking.findById(bookingId).select('user totalCost');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    // A booking that belongs to a user may only be paid for by that user.
    if (booking.user && (!req.user || String(booking.user) !== req.user.id)) {
      return res.status(403).json({ error: 'You are not allowed to pay for this booking.' });
    }

    const serverAmount = Math.round(Number(booking.totalCost || 0) * 100);
    if (!validateAmount(serverAmount)) {
      return res.status(400).json({ error: 'This booking has no valid payable amount.' });
    }
    // Server value wins; a tampered client amount is rejected outright.
    if (validateAmount(amount) && amount !== serverAmount) {
      console.warn(`[payment] Amount mismatch for booking ${bookingId}: client=${amount} server=${serverAmount}`);
      return res.status(400).json({ error: 'Payment amount does not match the booking total.' });
    }
    amount = serverAmount;
  }

  if (!validateAmount(amount)) {
    return res.status(400).json({ error: 'Invalid amount. Amount must be an integer in paise between 100 and 1000000000.' });
  }

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: 'receipt_order_' + Date.now(),
    payment_capture: 1,
  });

  await PaymentOrder.create({
    razorpayOrderId: order.id,
    expectedAmount: amount,
    currency: 'INR',
    user: req.user ? req.user.id : null,
    booking: booking ? booking._id : null,
    status: 'created',
  });

  return res.json(order);
}));

app.get('/api/get-razorpay-key', (req, res) => {
  // Publishable key only — the secret never leaves the server.
  res.json({ key: process.env.RAZORPAY_KEY_ID || '' });
});

/**
 * Verify a Razorpay payment.
 *
 * Trust chain: HMAC signature → stored PaymentOrder → Razorpay's own record of
 * the payment. Amount, order linkage and payment status all come from the
 * server side; the request body is used only for the three Razorpay handles.
 */
app.post('/api/verify-payment', paymentLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const razorpayOrderId = cleanString(req.body.razorpay_order_id, 120);
  const razorpayPaymentId = cleanString(req.body.razorpay_payment_id, 120);
  const razorpaySignature = cleanString(req.body.razorpay_signature, 256);

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ success: false, error: 'Incomplete payment details' });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ success: false, error: 'Payment service is not configured' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const provided = Buffer.from(razorpaySignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  const signatureValid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!signatureValid) {
    console.warn('[payment] Signature mismatch for order', razorpayOrderId);
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  // The order must be one this server created.
  const paymentOrder = await PaymentOrder.findOne({ razorpayOrderId });
  if (!paymentOrder) {
    console.warn('[payment] Unknown order id presented for verification:', razorpayOrderId);
    return res.status(400).json({ success: false, error: 'Unknown payment order' });
  }

  // Cross-check against Razorpay itself: real status, real amount, real order.
  let trustedAmount = paymentOrder.expectedAmount;
  try {
    const remotePayment = await getRazorpay().payments.fetch(razorpayPaymentId);
    const capturedStates = ['captured', 'authorized'];
    if (!remotePayment || !capturedStates.includes(remotePayment.status)) {
      return res.status(400).json({ success: false, error: 'Payment has not been completed' });
    }
    if (remotePayment.order_id !== razorpayOrderId) {
      return res.status(400).json({ success: false, error: 'Payment does not belong to this order' });
    }
    if (Number(remotePayment.amount) !== Number(paymentOrder.expectedAmount)) {
      console.warn(`[payment] Amount mismatch on verify: gateway=${remotePayment.amount} expected=${paymentOrder.expectedAmount}`);
      return res.status(400).json({ success: false, error: 'Payment amount mismatch' });
    }
    trustedAmount = Number(remotePayment.amount);
  } catch (fetchErr) {
    // Signature already proved authenticity; fall back to the stored amount.
    console.error('[payment] Could not fetch payment from Razorpay:', fetchErr.message);
  }

  paymentOrder.status = 'paid';
  paymentOrder.razorpayPaymentId = razorpayPaymentId;
  paymentOrder.verifiedAt = new Date();
  await paymentOrder.save();

  // Idempotent: replaying the same callback updates rather than duplicates.
  await Payment.findOneAndUpdate(
    { sessionId: razorpayOrderId },
    {
      $set: {
        sessionId: razorpayOrderId,
        paymentIntent: razorpayPaymentId,
        amount: trustedAmount,
        currency: paymentOrder.currency || 'INR',
        status: 'paid',
        email: cleanString(req.body.email, 200) || 'user@example.com',
        method: cleanString(req.body.method, 40) || 'razorpay',
        created: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // If the order was raised against an existing booking, confirm it server-side.
  if (paymentOrder.booking) {
    await Booking.findByIdAndUpdate(paymentOrder.booking, {
      $set: {
        status: 'Confirmed',
        bookingStatus: 'Confirmed',
        paymentStatus: 'Success',
        'payment.status': 'Success',
        'payment.amount': trustedAmount / 100,
        'payment.transactionId': razorpayPaymentId,
      },
    });
  }

  return res.json({ success: true });
}));

app.get('/api/payment-status/:sessionId', asyncHandler(async (req, res) => {
  const sessionId = cleanString(req.params.sessionId, 120);
  const payment = await Payment.findOne({ sessionId }).select('status').lean();
  if (!payment) return res.status(404).json({ error: 'Not found' });
  res.json({ status: payment.status });
}));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
