// Quick test to verify image fetching works
async function testImageFetch(placeName) {
    console.log(`\nTesting image fetch for: "${placeName}"`);
    
    // Test Wikipedia Hero Image
    try {
        const encoded = encodeURIComponent(placeName);
        const res = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&pithumbsize=1200&pilimit=1&format=json&origin=*`
        );
        const data = await res.json();
        const pages = data.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        const heroUrl = pages[pageId]?.thumbnail?.source;
        if (heroUrl) {
            console.log(`  ✅ Wikipedia hero image found: ${heroUrl}`);
        } else {
            console.log(`  ❌ No Wikipedia hero image found (pageId: ${pageId})`);
        }
    } catch(e) {
        console.log(`  ❌ Wikipedia failed:`, e.message);
    }
    
    // Test Wikimedia Commons
    try {
        const query = encodeURIComponent(`${placeName} tourism`);
        const res = await fetch(
            `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${query}&srnamespace=6&srlimit=5&format=json&origin=*`
        );
        const data = await res.json();
        const results = data.query?.search || [];
        const photos = results.filter(r => {
            const t = r.title.toLowerCase();
            return (t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.png')) &&
                   !t.includes('icon') && !t.includes('flag') && !t.includes('logo') && !t.includes('.svg');
        });
        console.log(`  ✅ Wikimedia Commons found ${photos.length} photos`);
        if (photos.length > 0) console.log(`     First: ${photos[0].title}`);
    } catch(e) {
        console.log(`  ❌ Wikimedia Commons failed:`, e.message);
    }
}

(async () => {
    await testImageFetch('Goa');
    await testImageFetch('Jaipur');
    await testImageFetch('Kerala');
    await testImageFetch('Taj Mahal');
})();
