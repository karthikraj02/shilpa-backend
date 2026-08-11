const mongoose = require('mongoose');
const Destination = require('./models/Destination');

mongoose.connect('mongodb://localhost:27017/ai-tourist').then(async () => {
    await Destination.deleteMany({});
    await Destination.insertMany([
        {
            name: 'Malibu Beach',
            location: 'California',
            category: 'beach',
            description: 'Beautiful sandy beach with perfect waves.',
            price: 4500,
            imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=500&h=300&fit=crop'
        },
        {
            name: 'Aspen Mountain',
            location: 'Colorado',
            category: 'mountain',
            description: 'Incredible skiing and mountain views.',
            price: 18500,
            imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&h=300&fit=crop'
        },
        {
            name: 'Colosseum',
            location: 'Rome',
            category: 'historical',
            description: 'Ancient amphitheater with a rich history.',
            price: 3800,
            imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&h=300&fit=crop'
        }
    ]);
    console.log('Seeded database!');
    process.exit(0);
}).catch(console.error);
