const mongoose = require('mongoose');

const TravelerSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
  type: { type: String }, // hotel, transport, food, shopping, other
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TripSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  bookingProvider: { type: String, default: '' },
  bookingId: { type: String, default: '' },
  bookingScreenshot: { type: String, default: '' }, // Base64 or URL
  transportDetails: { type: Object, default: {} },
  hotelDetails: { type: Object, default: {} },
  destination: { type: String, default: '' },
  travelDate: { type: Date },
  status: { type: String, default: 'upcoming' }, // upcoming, ongoing, completed, cancelled
  budgetPlanned: { type: Number, default: 0 },
  expenses: { type: [ExpenseSchema], default: [] },
  travelers: { type: [TravelerSchema], default: [] },
  memories: { type: [String], default: [] }, // image URLs or base64
  reviews: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

TripSchema.index({ userId: 1, travelDate: -1 });

module.exports = mongoose.model('Trip', TripSchema);
