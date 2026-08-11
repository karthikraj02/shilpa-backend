const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
    type: { type: String, enum: ['flight', 'bus', 'train'], required: true },
    name: { type: String, required: true },
    number: { type: String },                    // Train number / Flight code
    from: { type: String, required: true },
    to: { type: String, required: true },
    fromStation: { type: String },               // Airport / Station / Stop name
    toStation: { type: String },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true },
    availableSeats: { type: Number, default: 40 },
    rating: { type: Number, default: 4.0 },
    logo: { type: String },                      // Airline / Bus operator logo URL
    // Flight-specific
    flightType: { type: String, enum: ['Non-stop', 'Connecting', ''], default: '' },
    airline: { type: String },
    // Bus-specific
    busType: { type: String },                   // AC Sleeper, Non-AC Seater, etc.
    acType: { type: String, enum: ['AC', 'Non-AC', ''], default: '' },
    seatType: { type: String, enum: ['Sleeper', 'Seater', 'Semi-Sleeper', ''], default: '' },
    boardingPoint: { type: String },
    // Train-specific
    platform: { type: String },
    coachType: { type: String },                 // Sleeper, AC 3-Tier, AC 2-Tier, etc.
    // Tags
    isCheapest: { type: Boolean, default: false },
    isFastest: { type: Boolean, default: false },
    isBestValue: { type: Boolean, default: false }
}, { timestamps: true });

transportSchema.index({ from: 1, to: 1, type: 1, price: 1 });

module.exports = mongoose.model('Transport', transportSchema);
