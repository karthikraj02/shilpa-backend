// Quick one-time script to clean up duplicate destinations created by the dynamic fallback
require('dotenv').config();
const { connectDB } = require('./db');
const Destination = require('./models/Destination');

async function cleanup() {
    await connectDB();
    
    // Find and remove any destinations with placehold.co or loremflickr URLs (these are junk entries)
    const junkEntries = await Destination.find({
        $or: [
            { imageUrl: { $regex: /placehold\.co/i } },
            { imageUrl: { $regex: /loremflickr\.com/i } }
        ]
    });
    
    if (junkEntries.length > 0) {
        console.log(`Found ${junkEntries.length} junk destination(s) to clean up:`);
        for (const entry of junkEntries) {
            console.log(`  ❌ Removing: "${entry.name}" (imageUrl: ${entry.imageUrl})`);
            await Destination.deleteOne({ _id: entry._id });
        }
        console.log('✅ Cleanup complete!');
    } else {
        console.log('✅ No junk entries found. Database is clean.');
    }
    
    // Also check for any duplicate names
    const allDests = await Destination.find({});
    const nameMap = {};
    for (const d of allDests) {
        const key = d.name.toLowerCase();
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(d);
    }
    
    for (const [name, entries] of Object.entries(nameMap)) {
        if (entries.length > 1) {
            console.log(`\n⚠️  Found ${entries.length} duplicates for "${name}":`);
            // Keep the one with the most data (most fields filled), delete the rest
            entries.sort((a, b) => {
                const aScore = (a.image_gallery?.length || 0) + (a.hotels?.length || 0) + (a.attractions?.length || 0);
                const bScore = (b.image_gallery?.length || 0) + (b.hotels?.length || 0) + (b.attractions?.length || 0);
                return bScore - aScore;
            });
            console.log(`  ✅ Keeping: "${entries[0].name}" (ID: ${entries[0]._id}, images: ${entries[0].image_gallery?.length || 0})`);
            for (let i = 1; i < entries.length; i++) {
                console.log(`  ❌ Removing duplicate: "${entries[i].name}" (ID: ${entries[i]._id})`);
                await Destination.deleteOne({ _id: entries[i]._id });
            }
        }
    }
    
    console.log('\n🎉 Database cleanup finished.');
    process.exit(0);
}

cleanup().catch(err => {
    console.error('Cleanup error:', err);
    process.exit(1);
});
