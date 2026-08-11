// Quick script to force-update MongoDB destination images to correct URLs
require('dotenv').config();
const { connectDB } = require('./db');
const Destination = require('./models/Destination');

const correctImages = {
    'Goa': {
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Palolem_Beach.jpg?width=1280',
        image_gallery: [
            'https://commons.wikimedia.org/wiki/Special:FilePath/Palolem_Beach.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Dudhsagar_Falls.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Church_of_St._Cajetan_(Goa).jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Fort_Aguada_Goa.jpg?width=1280'
        ]
    },
    'Mysore': {
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280',
        image_gallery: [
            'https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_illuminated.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Brindavan_Gardens_fountain.jpg?width=1280'
        ]
    },
    'Udupi': {
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Udupi_Sri_Krishna_Temple_3.jpg?width=1280',
        image_gallery: [
            'https://commons.wikimedia.org/wiki/Special:FilePath/Udupi_Sri_Krishna_Temple_3.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/St._Mary\'s_Island,_Udupi_01.jpg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Malpe_beach_2.JPG?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Kapu_beach_lighthouse.jpg?width=1280'
        ]
    },
    'Taj Mahal': {
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg?width=1280',
        image_gallery: [
            'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Agra_Fort_-_views_inside_and_outside_(6).JPG?width=1280',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Mehtab_Bagh,_Agra.jpg?width=1280'
        ]
    }
};

async function fixImages() {
    await connectDB();
    
    for (const [name, images] of Object.entries(correctImages)) {
        const result = await Destination.updateOne(
            { name: name },
            { 
                $set: { 
                    imageUrl: images.imageUrl,
                    heroImageUrl: images.imageUrl,
                    image_gallery: images.image_gallery
                } 
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`✅ ${name}: images FIXED (${images.image_gallery.length} gallery images)`);
        } else if (result.matchedCount > 0) {
            console.log(`⚠️  ${name}: found but already up to date`);
        } else {
            console.log(`❌ ${name}: NOT FOUND in DB`);
        }
    }
    
    // Also clear any cached wrong images for Manipal, Bangalore, etc.
    const dynamicFixes = {
        'Manipal': 'https://commons.wikimedia.org/wiki/Special:FilePath/Night_in_Manipal.jpg?width=1280',
        'Bangalore': 'https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280',
        'Bengaluru': 'https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280'
    };
    
    for (const [name, heroUrl] of Object.entries(dynamicFixes)) {
        const result = await Destination.updateOne(
            { name: { $regex: new RegExp('^' + name + '$', 'i') } },
            { 
                $set: { 
                    imageUrl: heroUrl,
                    heroImageUrl: heroUrl
                } 
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`✅ ${name}: hero image FIXED`);
        }
    }
    
    console.log('\nDone. All destination images updated.');
    process.exit(0);
}

fixImages().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
