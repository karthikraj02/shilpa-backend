const axios = require('axios');

const KEYWORDS = {
  transport: ['train cancelled', 'train cancelled', 'flight delayed', 'flight delay', 'bus missed', 'lost ticket', 'missed flight', 'cancelled train', 'delayed flight', 'bus late', 'missed bus'],
  hotel: ['booking not found', 'hotel overbooked', 'check-in problem', 'no booking', 'room not found', 'overbooked'],
  payment: ['payment deducted', 'payment failed', 'failed transaction', 'payment deducted but', 'transaction failed'],
  personal: ['lost wallet', 'lost passport', 'lost luggage', 'lost phone', 'stolen', 'pickpocket'],
  medical: ['feeling sick', 'fever', 'injury', 'need hospital', 'need pharmacy', 'sick', 'hurt', 'pain'],
  weather: ['heavy rain', 'flood', 'storm', 'heat', 'extreme heat', 'heatwave'],
  safety: ['unsafe area', 'theft', 'danger', 'emergency help', 'attack', 'robbed']
};

function detectType(query) {
  const q = (query || '').toLowerCase();
  for (const [type, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      if (q.includes(w)) return type;
    }
  }
  // fallback checks for short phrases
  if (q.includes('hospital') || q.includes('pharmacy') || q.includes('sick')) return 'medical';
  if (q.includes('police') || q.includes('unsafe') || q.includes('danger') || q.includes('theft')) return 'safety';
  if (q.includes('lost') || q.includes('stolen')) return 'personal';
  return 'general';
}

// Overpass-based nearby search similar to nearbyRoutes
async function findNearby(lat, lng, type) {
  try {
    const tagMap = {
      hospital: 'amenity=hospital',
      police: 'amenity=police',
      pharmacy: 'amenity=pharmacy',
      hotel: 'tourism=hotel',
      restaurant: 'amenity=restaurant',
      transport: 'public_transport=platform'
    };
    const tag = tagMap[type] || `amenity=${type}`;
    const radius = 5000;
    const query = `
      [out:json];
      node(${tag})(around:${radius},${lat},${lng});
      out 10;
    `;
    const res = await axios.post('https://overpass-api.de/api/interpreter', query);
    if (!res.data || !res.data.elements) return [];
    const places = res.data.elements.map(el => ({
      id: el.id,
      name: el.tags?.name || 'Unnamed',
      lat: el.lat,
      lng: el.lon
    }));
    return places;
  } catch (err) {
    return [];
  }
}

function buildGuidance(type, query, nearby) {
  const steps = [];
  if (type === 'transport') {
    steps.push('1) Contact the carrier or check their website/app for official updates.');
    steps.push('2) If you are at the station/airport, find the airline/train counter and ask for rebooking or refund options.');
    steps.push('3) Keep your ticket/PNR and any proof of payment ready.');
    steps.push('4) If stuck overnight, consider nearby hotels (see suggestions).');
    steps.push('Alternative options: take the next available service, consider bus/train combos, or look for private transfers.');
  } else if (type === 'hotel') {
    steps.push('1) Show booking confirmation and ID to reception.');
    steps.push('2) Ask to speak to the manager and request an alternative room or partner hotel.');
    steps.push('3) If overbooked, request documentation and a written confirmation that they will relocate you.');
    steps.push('Nearby hotels are listed below for quick rebooking.');
  } else if (type === 'payment') {
    steps.push('1) Check bank transaction status and save screenshots of the payment.');
    steps.push('2) Contact the payment provider or bank immediately and open a dispute if needed.');
    steps.push('3) Contact the platform support with payment details and screenshots.');
  } else if (type === 'personal') {
    steps.push('1) If passport lost, contact your country embassy/consulate immediately for emergency travel docs.');
    steps.push('2) For lost wallet/phone, report to the nearest police station and block cards/phones.');
    steps.push('3) Use nearby services for quick help (hotels, police, banks listed).');
  } else if (type === 'medical') {
    steps.push('1) If severe, call local emergency services immediately.');
    steps.push('2) Visit the nearest hospital or clinic; we list nearby hospitals below.');
    steps.push('3) If you have medication or allergies, inform clinical staff immediately.');
  } else if (type === 'weather') {
    steps.push('1) Seek shelter immediately and avoid travel until authorities declare it safe.');
    steps.push('2) Follow local weather advisories and evacuation instructions if issued.');
    steps.push('3) Keep emergency kit, water, phone charged, and inform someone of your location.');
  } else if (type === 'safety') {
    steps.push('1) Move to a well-lit public area or a nearby hotel/restaurant.');
    steps.push('2) Contact local police and emergency services; report the incident.');
    steps.push('3) If belongings were stolen, block cards and phones and get a police report for insurance.');
  } else {
    steps.push('1) Describe the issue in more detail so we can provide targeted help.');
  }
  const guidance = `I detected this as a "${type}" situation. Here are immediate steps:
\n${steps.join('\n')}`;

  let suggestions = '';
  if (nearby && Object.keys(nearby).length > 0) {
    suggestions = '\n\nNearby helpful places:\n';
    for (const k of Object.keys(nearby)) {
      const list = nearby[k];
      if (list && list.length > 0) {
        suggestions += `\n${k.toUpperCase()}: ` + list.slice(0,3).map(p => `${p.name}`).join(' | ');
      }
    }
  }

  return guidance + suggestions + '\n\nIf you want, I can call local services or help book transport/hotel and guide next steps.';
}

async function generateResponse({ query, lat, lng }) {
  const type = detectType(query);
  const nearby = {};
  try {
    if (lat && lng) {
      const [hospitals, police, pharmacy, hotels, restaurants] = await Promise.all([
        findNearby(lat, lng, 'hospital'),
        findNearby(lat, lng, 'police'),
        findNearby(lat, lng, 'pharmacy'),
        findNearby(lat, lng, 'hotel'),
        findNearby(lat, lng, 'restaurant')
      ]);
      nearby.hospitals = hospitals;
      nearby.police = police;
      nearby.pharmacies = pharmacy;
      nearby.hotels = hotels;
      nearby.restaurants = restaurants;
    }
  } catch (err) {
    // ignore nearby failures
  }
  const aiResponse = buildGuidance(type, query, nearby);
  return { type, aiResponse, nearby };
}

module.exports = { generateResponse, detectType };
