const express = require('express');
const router = express.Router();
const Transport = require('../models/Transport');
const adminAuth = require('../middleware/adminAuth');
const { cleanString, escapeRegex } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/transports?from=Bangalore&to=Goa&type=flight
router.get('/', asyncHandler(async (req, res) => {
    const from = cleanString(req.query.from, 100);
    const to = cleanString(req.query.to, 100);
    const typeRaw = cleanString(req.query.type, 20).toLowerCase();
    const type = ['flight', 'bus', 'train'].includes(typeRaw) ? typeRaw : '';

    const query = {};
    if (from) query.from = { $regex: escapeRegex(from), $options: 'i' };
    if (to) query.to = { $regex: escapeRegex(to), $options: 'i' };
    if (type) query.type = type;

    let results = await Transport.find(query).sort({ price: 1 }).limit(100);

    // If no DB results, generate smart dummy data dynamically
    if (results.length === 0) {
        results = generateDynamicTransport(from || 'Bangalore', to || 'Goa', type || null);
    }

    // Tag cheapest, fastest, best value
    if (results.length > 0) {
        const arr = [...results].map(r => r.toObject ? r.toObject() : r);
        const cheapest = arr.reduce((a, b) => a.price < b.price ? a : b);
        const fastest = arr.reduce((a, b) => parseDuration(a.duration) < parseDuration(b.duration) ? a : b);
        arr.forEach(r => {
            r.isCheapest = r.name === cheapest.name && r.price === cheapest.price;
            r.isFastest = r.name === fastest.name && r.duration === fastest.duration;
            r.isBestValue = r.rating >= 4.3 && r.price <= cheapest.price * 1.3;
        });
        return res.json(arr);
    }

    res.json(results);
}));

// POST /api/transports/seed — administrators only (was publicly callable)
router.post('/seed', adminAuth, asyncHandler(async (req, res) => {
    const count = await Transport.countDocuments();
    if (count > 0) return res.json({ message: `Already seeded (${count} records exist)` });

    const sampleData = buildSeedData();
    await Transport.insertMany(sampleData);
    res.json({ message: `Seeded ${sampleData.length} transport records successfully!` });
}));

function parseDuration(d) {
    const match = d.match(/(\d+)h\s*(\d*)m?/);
    if (!match) return 999;
    return parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
}

function generateDynamicTransport(from, to, type) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const flights = [
        { type:'flight', name:'IndiGo 6E-302', number:'6E-302', from, to, fromStation:`${from} International Airport`, toStation:`${to} Airport`, departureTime:`${dateStr}, 06:15`, arrivalTime:`08:30`, duration:'2h 15m', price:4299, availableSeats:32, rating:4.2, logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IndiGo_Airlines_logo.svg/200px-IndiGo_Airlines_logo.svg.png', flightType:'Non-stop', airline:'IndiGo' },
        { type:'flight', name:'Air India AI-501', number:'AI-501', from, to, fromStation:`${from} International Airport`, toStation:`${to} Airport`, departureTime:`${dateStr}, 09:45`, arrivalTime:`11:50`, duration:'2h 05m', price:5899, availableSeats:18, rating:4.5, logo:'https://upload.wikimedia.org/wikipedia/en/thumb/5/58/Air_India_Logo.svg/200px-Air_India_Logo.svg.png', flightType:'Non-stop', airline:'Air India' },
        { type:'flight', name:'SpiceJet SG-415', number:'SG-415', from, to, fromStation:`${from} Airport`, toStation:`${to} Airport`, departureTime:`${dateStr}, 14:30`, arrivalTime:`17:00`, duration:'2h 30m', price:3699, availableSeats:45, rating:3.9, logo:'https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/SpiceJet_logo.svg/200px-SpiceJet_logo.svg.png', flightType:'Non-stop', airline:'SpiceJet' },
        { type:'flight', name:'Vistara UK-839', number:'UK-839', from, to, fromStation:`${from} International Airport`, toStation:`${to} Airport`, departureTime:`${dateStr}, 18:10`, arrivalTime:`20:30`, duration:'2h 20m', price:6499, availableSeats:12, rating:4.7, logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Vistara_logo.svg/200px-Vistara_logo.svg.png', flightType:'Non-stop', airline:'Vistara' }
    ];
    const buses = [
        { type:'bus', name:'SRS Travels', from, to, fromStation:`${from} Majestic Bus Stand`, toStation:`${to} Central Bus Stand`, departureTime:`${dateStr}, 21:00`, arrivalTime:`07:30`, duration:'10h 30m', price:899, availableSeats:28, rating:4.1, busType:'AC Sleeper', acType:'AC', seatType:'Sleeper', boardingPoint:`${from} Majestic`, logo:'' },
        { type:'bus', name:'VRL Travels', from, to, fromStation:`${from} Satellite Bus Stand`, toStation:`${to} Bus Station`, departureTime:`${dateStr}, 22:15`, arrivalTime:`08:00`, duration:'9h 45m', price:1199, availableSeats:15, rating:4.4, busType:'Volvo Multi-Axle AC Sleeper', acType:'AC', seatType:'Sleeper', boardingPoint:`${from} Satellite`, logo:'' },
        { type:'bus', name:'KPN Travels', from, to, fromStation:`${from} Central`, toStation:`${to} Stand`, departureTime:`${dateStr}, 20:00`, arrivalTime:`07:00`, duration:'11h', price:699, availableSeats:38, rating:3.8, busType:'Non-AC Seater', acType:'Non-AC', seatType:'Seater', boardingPoint:`${from} Central`, logo:'' },
        { type:'bus', name:'Orange Travels', from, to, fromStation:`${from} Majestic`, toStation:`${to} Bus Stand`, departureTime:`${dateStr}, 23:00`, arrivalTime:`08:30`, duration:'9h 30m', price:1499, availableSeats:10, rating:4.6, busType:'Mercedes AC Semi-Sleeper', acType:'AC', seatType:'Semi-Sleeper', boardingPoint:`${from} Majestic`, logo:'' }
    ];
    const trains = [
        { type:'train', name:'Shatabdi Express', number:'12027', from, to, fromStation:`${from} City Junction`, toStation:`${to} Main Station`, departureTime:`${dateStr}, 06:00`, arrivalTime:`14:30`, duration:'8h 30m', price:1285, availableSeats:120, rating:4.3, platform:'3', coachType:'AC Chair Car', logo:'' },
        { type:'train', name:'Rajdhani Express', number:'12431', from, to, fromStation:`${from} Central`, toStation:`${to} Terminus`, departureTime:`${dateStr}, 17:00`, arrivalTime:`23:30`, duration:'6h 30m', price:2150, availableSeats:65, rating:4.6, platform:'1', coachType:'AC 2-Tier', logo:'' },
        { type:'train', name:'Vande Bharat Express', number:'20651', from, to, fromStation:`${from} City Junction`, toStation:`${to} Main Station`, departureTime:`${dateStr}, 05:50`, arrivalTime:`11:00`, duration:'5h 10m', price:2690, availableSeats:40, rating:4.8, platform:'1A', coachType:'Executive Chair Car', logo:'' },
        { type:'train', name:'Jan Shatabdi Express', number:'12066', from, to, fromStation:`${from} Junction`, toStation:`${to} Station`, departureTime:`${dateStr}, 07:15`, arrivalTime:`16:45`, duration:'9h 30m', price:685, availableSeats:200, rating:3.9, platform:'5', coachType:'Sleeper', logo:'' }
    ];

    if (type === 'flight') return flights;
    if (type === 'bus') return buses;
    if (type === 'train') return trains;
    return [...flights, ...buses, ...trains];
}

function buildSeedData() {
    const routes = [
        ['Bangalore', 'Goa'], ['Mumbai', 'Delhi'], ['Chennai', 'Hyderabad'],
        ['Delhi', 'Jaipur'], ['Bangalore', 'Mysore'], ['Kolkata', 'Darjeeling']
    ];
    let allData = [];
    for (const [from, to] of routes) {
        allData.push(...generateDynamicTransport(from, to, null));
    }
    return allData;
}

module.exports = router;
