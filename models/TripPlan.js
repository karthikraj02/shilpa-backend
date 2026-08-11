const mongoose = require('mongoose');

const tripPlanSchema = new mongoose.Schema({
    destination: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    category: { type: String, required: true },
    duration: { type: String, required: true },
    
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    
    heroImage: { type: String, required: true },
    gallery: [{ type: String }],
    
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    
    description: { type: String, required: true },
    attractions: [{ type: String }],
    bestTime: { type: String },
    
    transport: { type: String, default: 'Not Included' },
    hotel: { type: String, default: 'Not Included' },
    meals: { type: String, default: 'Not Included' },
    
    cancellationPolicy: { type: String, default: 'Free cancellation up to 48 hours before trip' },
    seatsLeft: { type: Number, default: 10 },
    
    weather: { type: String },
    itinerary: [{
        day: { type: Number },
        title: { type: String },
        activities: [{ type: String }]
    }],
    
    // Analytics & Filtering
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 }
});

module.exports = mongoose.model('TripPlan', tripPlanSchema);
