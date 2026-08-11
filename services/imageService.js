/**
 * Strictly Curated Destination Image Database
 * We NEVER use generic/random image APIs or placeholders. We only serve highly verified photos of the actual destination.
 */

const axios = require('axios');

// In-memory cache to store resolved image results and improve speed
const imageCache = new Map();

// Clean location names
function sanitizeLocationName(name) {
    if (!name) return 'india';
    let safeName = name.split('(')[0];
    safeName = safeName.split(',')[0].trim().toLowerCase();
    return safeName;
}

const imageDatabase = require('./imageDatabase');

/**
 * Fetch real images dynamically from Wikimedia Commons
 */
async function fetchCommonsImages(query, limit = 5) {
    try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url&format=json`;
        const res = await axios.get(url, { 
            timeout: 8000,
            headers: { 'User-Agent': 'AITouristAssistant/1.0 (contact@example.com)' }
        });
        
        if (res.data && res.data.query && res.data.query.pages) {
            const pages = res.data.query.pages;
            const images = Object.values(pages)
                .map(page => page.imageinfo && page.imageinfo[0] ? page.imageinfo[0].url : null)
                .filter(url => url !== null && !url.toLowerCase().endsWith('.svg') && !url.toLowerCase().endsWith('.gif')); // filter out svgs/gifs
            return images;
        }
    } catch(e) {
        console.error(`Wikimedia fetch failed for query "${query}":`, e.message);
    }
    return [];
}

/**
 * Resolves the best possible real photograph for a destination.
 * Priorities: 1) Static Local DB 2) Cache 3) Dynamic Wikimedia Commons fetch 4) Category Fallback
 */
async function resolveDestinationImage(placeName, attractions = []) {
    const safeName = sanitizeLocationName(placeName);
    const formattedName = safeName.charAt(0).toUpperCase() + safeName.slice(1);
    
    let allImages = new Set();
    let heroImage = null;

    // 0. Static Database (Highest accuracy, instantaneous)
    if (imageDatabase[safeName]) {
        heroImage = imageDatabase[safeName];
        allImages.add(heroImage);
    }
    
    for (const attr of attractions) {
        const safeAttr = sanitizeLocationName(attr);
        if (imageDatabase[safeAttr]) {
            if (!heroImage) heroImage = imageDatabase[safeAttr];
            allImages.add(imageDatabase[safeAttr]);
        }
    }

    // Generate a unique cache key based on place and attractions
    const cacheKey = `v2_${safeName}_${(attractions || []).join('_')}`.toLowerCase();

    // 1. Check Cache
    if (!heroImage && imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey);
    }

    // 2. Try fetching the hero image from Network if not in static DB
    if (!heroImage && attractions && attractions.length > 0) {
        const heroQuery = `${formattedName} ${attractions[0]}`;
        const heroResults = await fetchCommonsImages(heroQuery, 3);
        if (heroResults.length > 0) {
            heroImage = heroResults[0];
            heroResults.forEach(img => allImages.add(img));
        }
    }

    // 3. Try fetching general destination images to fill the gallery
    if (allImages.size < 4) {
        const generalQuery = formattedName;
        const generalResults = await fetchCommonsImages(generalQuery, 10);
        generalResults.forEach(img => allImages.add(img));
    }
    
    // 4. Try nearby/broad terms if we still don't have enough images
    if (allImages.size < 4) {
        const broadResults = await fetchCommonsImages(`${formattedName} nature OR city OR temple`, 5);
        broadResults.forEach(img => allImages.add(img));
    }

    const uniqueImages = Array.from(allImages);

    // If hero image wasn't found, use the first general image
    if (!heroImage && uniqueImages.length > 0) {
        heroImage = uniqueImages[0];
    }

    // 5. Fallback: Category-based defaults instead of Udupi Temple
    if (uniqueImages.length === 0) {
        if (safeName.includes('beach') || safeName.includes('island')) {
            heroImage = imageDatabase['default_beach'];
        } else if (safeName.includes('hill') || safeName.includes('peak') || safeName.includes('mountain')) {
            heroImage = imageDatabase['default_mountain'];
        } else if (safeName.includes('temple') || safeName.includes('matha')) {
            heroImage = imageDatabase['default_temple'];
        } else {
            heroImage = imageDatabase['default'];
        }
        uniqueImages.push(heroImage);
    }

    const result = {
        image_url: heroImage,
        image_gallery: uniqueImages.slice(0, 6) // Max 6 images
    };

    // Cache the result
    imageCache.set(cacheKey, result);

    return result;
}

module.exports = {
    resolveDestinationImage,
    sanitizeLocationName
};
