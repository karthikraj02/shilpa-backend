const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  paymentIntent: { type: String, required: true },
  amount: Number,
  currency: String,
  status: String, // 'paid' (success), 'unpaid' (fail)
  email: String,
  method: String, // 'card' or 'upi'
  created: Date,
});

module.exports = mongoose.model('Payment', paymentSchema);
