const mongoose = require('mongoose');

/**
 * Server-side record of every Razorpay order this backend creates.
 *
 * The client is never trusted for the payable amount at verification time:
 * `expectedAmount` (in paise) is written here when the order is created and is
 * the only amount used when the payment signature is verified.
 */
const paymentOrderSchema = new mongoose.Schema({
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    expectedAmount: { type: Number, required: true },      // paise
    currency: { type: String, default: 'INR' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    razorpayPaymentId: { type: String, default: null },
    verifiedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
