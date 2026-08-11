const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('../middleware/rateLimit');
const { boundedNumber, cleanString } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_TIPS = [
    "Stay aware of your surroundings.",
    "Keep your valuables secure.",
    "Follow local laws and customs."
];

function getSafetyModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const err = new Error('Safety tips are temporarily unavailable');
        err.status = 503; err.expose = true;
        throw err;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
}

// Emergency contacts for a region (static reference data)
router.get('/emergency/:region', (req, res) => {
    res.json({
        police: '100',
        ambulance: '102',
        fire: '101',
        touristHelpline: '1363',
        womenHelpline: '1091',
        disasterManagement: '108'
    });
});

// AI-generated safety tips — output shape is validated before it is returned
router.get('/tips/:destination',
    rateLimit({ name: 'safety-tips', windowMs: 5 * 60 * 1000, max: 40 }),
    asyncHandler(async (req, res) => {
        const dest = cleanString(req.params.destination, 120);
        if (!dest) return res.status(400).json({ error: 'Destination is required' });

        const prompt = `Provide 3 short, specific safety tips for tourists visiting ${dest}. 
        Return ONLY a JSON array of strings. No markdown formatting.`;

        let tips = DEFAULT_TIPS;
        try {
            const model = getSafetyModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                const clean = parsed
                    .filter(t => typeof t === 'string')
                    .map(t => t.trim().slice(0, 300))
                    .filter(Boolean)
                    .slice(0, 5);
                if (clean.length) tips = clean;
            }
        } catch (err) {
            console.error('Safety tips generation failed:', err.message);
        }

        res.json({ tips });
    })
);

// Weather warnings
router.get('/weather-warnings',
    rateLimit({ name: 'weather-warnings', windowMs: 60 * 1000, max: 30 }),
    asyncHandler(async (req, res) => {
        const lat = boundedNumber(req.query.lat, { min: -90, max: 90, fallback: null });
        const lng = boundedNumber(req.query.lng, { min: -180, max: 180, fallback: null });
        if (lat === null || lng === null) return res.status(400).json({ error: 'lat and lng required' });

        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,windspeed_10m_max&timezone=auto`,
            { timeout: 15000 }
        );

        const today = response.data?.daily || {};
        const warnings = [];

        if (today.precipitation_sum && today.precipitation_sum[0] > 20) {
            warnings.push({ type: 'Rain', message: 'Heavy rain expected today. Carry an umbrella.' });
        }
        if (today.windspeed_10m_max && today.windspeed_10m_max[0] > 40) {
            warnings.push({ type: 'Wind', message: 'Strong winds expected. Avoid coastal edges or high altitudes.' });
        }
        if (warnings.length === 0) {
            warnings.push({ type: 'Clear', message: 'Weather looks clear and safe for travel today.' });
        }

        res.json({ warnings });
    })
);

module.exports = router;
