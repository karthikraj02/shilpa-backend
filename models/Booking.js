const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    travelDate: { type: Date, required: true },
    numberOfPeople: { type: Number, required: true },
    fromCity: { type: String, default: 'Bangalore' },
    toCity: { type: String },
    returnDate: { type: Date },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    phone: { type: String },
    bookingType: { type: String, enum: ['Website', 'Official'], default: 'Website' },
    bookingStatus: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Redirected'], default: 'Pending' },
    providerName: { type: String },
    aiItinerary: { type: Object },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
    transport: { type: Object },
    stay: { type: Object },
    food: { type: Object },
    totalCost: { type: Number },
    payment: { type: Object },
    review: { type: Object },
    tripCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    travelStoryGenerated: { type: Boolean, default: false },
    reviewEmailSent: { type: Boolean, default: false },
    // External Booking Tracking
    externalBooking: { type: Boolean, default: false },
    pnr: { type: String },
    bookingReference: { type: String },
    ticketData: { type: String }, // Base64 PDF
    screenshotData: { type: String }, // Base64 Image
    flightDetails: { type: Object },
    trainDetails: { type: Object },
    busDetails: { type: Object },
    hotelDetails: { type: Object },
    paymentStatus: { type: String, default: 'Pending' },
    travelers: [{
        name: { type: String },
        age: { type: Number },
        gender: { type: String },
        mobile: { type: String },
        email: { type: String },
        ageCategory: { type: String },
        profileType: { type: String },
        specialRequirements: {
            wheelchair: { type: Boolean, default: false },
            seniorAssistance: { type: Boolean, default: false },
            extraLuggage: { type: Boolean, default: false },
            mealPreference: { type: String, default: 'No Preference' },
            pregnant: { type: Boolean, default: false },
            medicalConditionSupport: { type: Boolean, default: false },
            medicalConditionDetails: { type: String, default: '' },
            petTraveler: { type: Boolean, default: false },
            accessibleTransport: { type: Boolean, default: false },
            emergencySupport: { type: Boolean, default: false }
        }
    }],
    travelerType: { type: String },
    pricingBreakdown: { type: Object }
}, { timestamps: true });

// Indexes for the project's hot query paths
bookingSchema.index({ user: 1, createdAt: -1 });   // GET /api/bookings/my
bookingSchema.index({ status: 1, createdAt: -1 }); // admin dashboards
bookingSchema.index({ email: 1 });                 // receipt / review lookups
bookingSchema.index({ reviewEmailSent: 1, tripCompleted: 1 }); // review cron scan

module.exports = mongoose.model('Booking', bookingSchema);
