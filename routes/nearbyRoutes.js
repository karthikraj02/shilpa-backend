const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('../middleware/rateLimit');
const { boundedNumber, cleanString } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

// Only these place types may be forwarded to Overpass — the raw `type` value is
// never interpolated into the query any more.
const TAG_MAP = {
    restaurant: 'amenity=restaurant',
    hospital: 'amenity=hospital',
    atm: 'amenity=atm',
    hotel: 'tourism=hotel',
    police: 'amenity=police',
    attraction: 'tourism=attraction',
    pharmacy: 'amenity=pharmacy',
    fuel: 'amenity=fuel',
    cafe: 'amenity=cafe',
    bank: 'amenity=bank',
};

router.get('/',
    rateLimit({ name: 'nearby', windowMs: 60 * 1000, max: 30 }),
    asyncHandler(async (req, res) => {
        const lat = boundedNumber(req.query.lat, { min: -90, max: 90, fallback: null });
        const lng = boundedNumber(req.query.lng, { min: -180, max: 180, fallback: null });
        const type = cleanString(req.query.type, 30).toLowerCase();

        if (lat === null || lng === null || !type) {
            return res.status(400).json({ error: 'lat, lng, and type are required' });
        }

        const tag = TAG_MAP[type];
        if (!tag) {
            return res.status(400).json({ error: 'Unsupported place type' });
        }

        const radius = 5000;
        const overpassQuery = `
            [out:json];
            node(${tag})(around:${radius},${lat},${lng});
            out 20;
        `;

        const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, { timeout: 15000 });

        const places = (response.data?.elements || []).map(el => ({
            id: el.id,
            name: el.tags?.name || 'Unnamed place',
            lat: el.lat,
            lng: el.lon,
            distance: calculateDistance(lat, lng, el.lat, el.lon),
            type
        })).sort((a, b) => a.distance - b.distance);

        res.json(places);
    })
);

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1); // returned in km
}

module.exports = router;
