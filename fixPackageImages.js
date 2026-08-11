require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const TripPlan = require('./models/TripPlan');

const imageMappings = {
    'Goa': {
        heroImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1280&fit=crop', // Goa beach
        gallery: [
            'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1587922546307-776227941871?w=1280&fit=crop'
        ]
    },
    'Kerala': {
        heroImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1280&fit=crop', // Alleppey
        gallery: [
            'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1280&fit=crop'
        ]
    },
    'Hampi': {
        heroImage: 'https://images.unsplash.com/photo-1600078686880-9273cc09cbc1?w=1280&fit=crop', // Stone chariot/ruins
        gallery: [
            'https://images.unsplash.com/photo-1600078686880-9273cc09cbc1?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1588614532598-a537fec3a34a?w=1280&fit=crop'
        ]
    },
    'Gokarna': {
        heroImage: 'https://images.unsplash.com/photo-1560179406-1c6c60e0dc26?w=1280&fit=crop', // Om Beach
        gallery: [
            'https://images.unsplash.com/photo-1560179406-1c6c60e0dc26?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1589307004970-d73130c2390a?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1627521870233-a3d2e0523f6e?q=80&w=1280&fit=crop'
        ]
    },
    'Udupi': {
        heroImage: 'https://images.unsplash.com/photo-1596489376174-8db6db30a2eb?w=1280&fit=crop', // Beach
        gallery: [
            'https://images.unsplash.com/photo-1596489376174-8db6db30a2eb?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1520485984605-728795797171?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1626804475297-41609ea064eb?w=1280&fit=crop'
        ]
    },
    'Coorg': {
        heroImage: 'https://images.unsplash.com/photo-1581337204873-ef36aa186caa?w=1280&fit=crop', // Coffee plantation
        gallery: [
            'https://images.unsplash.com/photo-1581337204873-ef36aa186caa?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1605553592398-052be1bb3eec?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1623805971442-f28a0e365116?w=1280&fit=crop'
        ]
    },
    'Mysore': {
        heroImage: 'https://images.unsplash.com/photo-1600078686880-9273cc09cbc1?w=1280&fit=crop', // Palace proxy
        gallery: [
            'https://images.unsplash.com/photo-1600078686880-9273cc09cbc1?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1590772276527-2c96c449dbd7?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1610058511475-438411b71457?w=1280&fit=crop'
        ]
    },
    'Chikmagalur': {
        heroImage: 'https://images.unsplash.com/photo-1596547609652-9fc5b8cb4b2e?w=1280&fit=crop', // Mountain/coffee
        gallery: [
            'https://images.unsplash.com/photo-1596547609652-9fc5b8cb4b2e?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1627521870233-a3d2e0523f6e?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1605553592398-052be1bb3eec?w=1280&fit=crop'
        ]
    },
    'Varanasi': {
        heroImage: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1280&fit=crop', // Ganga ghat
        gallery: [
            'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1582510003294-58a04479343e?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1571536802807-3cab12681534?w=1280&fit=crop'
        ]
    },
    'Jaipur': {
        heroImage: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1280&fit=crop', // Hawa mahal
        gallery: [
            'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1280&fit=crop'
        ]
    },
    'Manali': {
        heroImage: 'https://images.unsplash.com/photo-1605649487212-4dcb1b6002f2?w=1280&fit=crop', // Snow mountains
        gallery: [
            'https://images.unsplash.com/photo-1605649487212-4dcb1b6002f2?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1616182186708-32a76f2f2936?w=1280&fit=crop'
        ]
    },
    'Leh': {
        heroImage: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1280&fit=crop', // Pangong lake
        gallery: [
            'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1612438214708-f428a707dd4e?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1591522209706-e17088abdc50?w=1280&fit=crop'
        ]
    },
    'Jim Corbett': {
        heroImage: 'https://images.unsplash.com/photo-1549473889-14f410d83298?w=1280&fit=crop', // Safari/Tiger proxy
        gallery: [
            'https://images.unsplash.com/photo-1549473889-14f410d83298?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1588820468087-4b4700d38b55?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1596702660722-e25c04c64390?w=1280&fit=crop'
        ]
    },
    'Ranthambore': {
        heroImage: 'https://images.unsplash.com/photo-1607513746994-51f730a41d99?w=1280&fit=crop', // Tiger reserve proxy
        gallery: [
            'https://images.unsplash.com/photo-1607513746994-51f730a41d99?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1518105779142-d971550c6085?w=1280&fit=crop',
            'https://images.unsplash.com/photo-1581900139779-7a57a151b6df?w=1280&fit=crop'
        ]
    }
};

async function fixImages() {
    await connectDB();
    
    const tripPlans = await TripPlan.find();
    
    for (const trip of tripPlans) {
        let destKey = Object.keys(imageMappings).find(k => trip.destination && trip.destination.toLowerCase().includes(k.toLowerCase()));
        
        if (destKey) {
            trip.heroImage = imageMappings[destKey].heroImage;
            trip.gallery = imageMappings[destKey].gallery;
            
            if (!trip.category) trip.category = 'Adventure';
            if (!trip.state) trip.state = 'Karnataka';
            // Auto tags
            if (trip.price > 30000) trip.tags.push('Luxury');
            if (trip.price < 15000) trip.tags.push('Budget');
            if (trip.category && trip.category.includes('Family')) trip.tags.push('Family');
            if (trip.category && trip.category.includes('Adventure')) trip.tags.push('Adventure');
            
            trip.tags = [...new Set(trip.tags)];
            
            // Random analytics for testing UI
            if (trip.views === 0) {
                trip.views = Math.floor(Math.random() * 5000) + 500;
                trip.bookings = Math.floor(Math.random() * 200) + 10;
                trip.likes = Math.floor(Math.random() * 1000) + 50;
                trip.popularityScore = (trip.views * 0.1) + (trip.bookings * 5) + (trip.likes * 0.5);
            }
            
            await trip.save();
            console.log(`✅ Fixed images & tags for ${trip.destination}`);
        } else {
            console.log(`⚠️ No specific mapping for ${trip.destination}`);
            // Assign random general images if missing
            if (!trip.heroImage || (typeof trip.heroImage === 'string' && trip.heroImage.includes('unsplash.com') === false)) {
                 trip.heroImage = 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1280&fit=crop';
                 trip.gallery = [
                     'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1280&fit=crop',
                     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&fit=crop'
                 ];
                 if (!trip.category) trip.category = 'Adventure';
                 if (!trip.state) trip.state = 'Karnataka';
                 await trip.save();
                 console.log(`🔄 Assigned generic images to ${trip.destination}`);
            }
        }
    }
    
    console.log('Finished updating TripPlan images and analytics.');
    process.exit(0);
}

fixImages().catch(err => {
    console.error(err);
    process.exit(1);
});
