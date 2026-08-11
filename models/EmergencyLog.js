const mongoose = require('mongoose');

const emergencyLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  query: { type: String, required: true },
  aiResponse: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  meta: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('EmergencyLog', emergencyLogSchema);
