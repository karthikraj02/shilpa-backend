const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true, enum: ['beach', 'mountain', 'historical', 'cultural', 'adventure', 'religious', 'wildlife'] },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    
    // Additional fields for rich detail cards & Explore More page
    heroImageUrl: { type: String, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    estimatedBudget: { type: Number, default: 0 },
    image_gallery: [{ type: String }],
    best_time: { type: String },
    weather: { type: Object },
    distance: { type: String },
    attractions: [{ type: String }],
    hotels: [{ type: Object }],
    transport_options: [{ type: String }],
    budgets: { type: Object },
    travel_tips: [{ type: String }],
    safety_tips: [{ type: String }],
    nearby_attractions: [{ type: String }],
    foods: [{ type: String }],
    itinerary_1_day: [{ type: Object }],
    itinerary_2_day: [{ type: Object }],
    itinerary_3_day: [{ type: Object }],
    reviews: [{ type: Object }]
});

// NOTE: no index is declared on `name` here on purpose — the deployed database
// already carries a unique index on it (the 11000 handling in the booking route
// depends on that), and re-declaring it with different options would fail to build.
destinationSchema.index({ category: 1 });
destinationSchema.index({ location: 1 });

module.exports = mongoose.model('Destination', destinationSchema);
