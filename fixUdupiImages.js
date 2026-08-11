require('dotenv').config();
const { connectDB } = require('./db');
const Destination = require('./models/Destination');

async function fix() {
    await connectDB();
    
    // Guaranteed working Unsplash direct image URLs
    const udupiImages = [
        'https://images.unsplash.com/photo-1596489376174-8db6db30a2eb?w=1280&fit=crop', // Beach / Sunset
        'https://images.unsplash.com/photo-1600078686880-9273cc09cbc1?w=1280&fit=crop', // Temple / Culture
        'https://images.unsplash.com/photo-1520485984605-728795797171?w=1280&fit=crop', // Coastal
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1280&fit=crop'  // India vibe
    ];

    const result = await Destination.updateOne(
        { name: /udupi/i },
        { 
            $set: { 
                imageUrl: udupiImages[0],
                heroImageUrl: udupiImages[0],
                image_gallery: udupiImages
            } 
        }
    );
    console.log('Udupi DB Fix:', result);
    process.exit(0);
}
fix();
