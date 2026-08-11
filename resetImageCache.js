require('dotenv').config();
const mongoose = require('mongoose');
const Destination = require('./models/Destination');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-tourist').then(async () => {
    const result = await Destination.updateMany({}, { $set: { heroImageUrl: '', image_gallery: [] } });
    console.log('Reset image cache for', result.modifiedCount, 'destinations');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
