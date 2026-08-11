const express = require('express');
const router = express.Router();
const axios = require('axios');
const Destination = require('../models/Destination');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');
const { requireObjectIdParam, cleanString, escapeRegex } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const MAX_CHAT_MESSAGE_LENGTH = 4000;
const MAX_CHAT_HISTORY_LENGTH = 20000;
const MAX_STORED_HISTORY_ITEMS = 200;

const { resolveDestinationImage, sanitizeLocationName } = require('../services/imageService');

// Smart keyword-based NLP logic with expanded detection
function getKeywords(msg) {
    const text = msg.toLowerCase();
    const categories = ['beach', 'mountain', 'historical', 'cultural', 'adventure', 'religious', 'wildlife'];
    let foundCategory = categories.find(c => text.includes(c));
    // Also detect plural/alternate forms
    if (!foundCategory && text.includes('beaches')) foundCategory = 'beach';
    if (!foundCategory && text.includes('mountains')) foundCategory = 'mountain';
    if (!foundCategory && text.includes('temple')) foundCategory = 'religious';
    if (!foundCategory && text.includes('church')) foundCategory = 'religious';
    if (!foundCategory && text.includes('fort')) foundCategory = 'historical';
    if (!foundCategory && text.includes('palace')) foundCategory = 'historical';
    if (!foundCategory && text.includes('trek')) foundCategory = 'adventure';
    if (!foundCategory && text.includes('safari')) foundCategory = 'wildlife';
    
    let intent = 'unknown';

    if (text.match(/\b(recommend|places|where to go|tourist|explore|visit|show|suggest|best|top|famous|popular|destination)\b/)) {
        intent = 'recommendation';
    } else if (text.match(/\b(book|reserve|booking)\b/)) {
        intent = 'booking';
    } else if (text.match(/\b(hi|hello|hey|greetings)\b/)) {
        intent = 'greeting';
    } else if (text.includes('thank')) {
        intent = 'thanks';
    } else if (text.match(/\b(bye|goodbye|see ya)\b/)) {
        intent = 'bye';
    } else if (text.includes('trips') || text.includes('packages') || text.includes('table')) {
        intent = 'trips';
    } else if (text.match(/\b(day|days|week|itinerary|plan|budget)\b/) && text.match(/\b(trip|tour|travel)\b/)) {
        intent = 'recommendation';
    }

    // If a category was found but no intent was matched, assume recommendation
    if (foundCategory && intent === 'unknown') intent = 'recommendation';

    console.log(`Debug getKeywords -> text: "${text}", intent: "${intent}", category: "${foundCategory || 'none'}"`);
    return { intent, category: foundCategory, text };
}

// Make sure to install: npm install @google/generative-ai
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post(
    '/',
    rateLimit({ name: 'chat', windowMs: 60 * 1000, max: 30, message: 'You are sending messages very quickly. Please wait a moment.' }),
    optionalAuth,
    async (req, res) => {
    const message = cleanString(req.body.message, MAX_CHAT_MESSAGE_LENGTH);
    const history = cleanString(req.body.history, MAX_CHAT_HISTORY_LENGTH);

    if (!message) {
        return res.status(400).json({ reply: 'Please type a message so I can help you.' });
    }

    // Identity for personalisation comes from the verified token only.
    let userId = req.user ? req.user.id : null;

    // Check if Gemini API is configured
    if (process.env.GEMINI_API_KEY) {
        try {
            console.log("Using Google Generative AI SDK for request...");
            
            let languageContext = "en";
            let communityPlacesContext = "No community places available.";
            let memoryContext = "No memory context.";
            
            if (userId) {
                {
                    {
                        const UserPreferences = require('../models/UserPreferences');
                        const prefs = await UserPreferences.findOne({ userId });
                        if (prefs) {
                            languageContext = prefs.preferredLanguage || "en";
                            memoryContext = `USER MEMORY CONTEXT:
- Favorite Destinations: ${(prefs.favoriteDestinations || []).join(', ')}
- Budget Preference: ${prefs.budgetPreference}
- Travel Style: ${(prefs.travelStyle || []).join(', ')}
- Dietary Preference: ${prefs.dietaryPreference}
- Previous Trips: ${(prefs.previousTrips || []).map(t => t.destination).join(', ')}
If the user doesn't specify details, default to these preferences. Acknowledge them if relevant.`;
                        } else {
                            memoryContext = "User is new. Pay attention to preferences to store them.";
                        }
                    }
                }
            }
            
            try {
                const CommunityPlace = require('../models/CommunityPlace');
                const places = await CommunityPlace.find({ isApproved: true }).limit(5);
                if (places.length > 0) {
                    communityPlacesContext = "COMMUNITY HIDDEN GEMS:\n" + places.map(p => `- ${p.placeName} (${p.category}): ${p.description}`).join('\n');
                }
            } catch(e) { console.log('Failed to fetch community places', e.message); }
            
            const systemPrompt = `You are an intelligent, conversational AI travel companion.
You must deeply understand the user's intent and extract specific constraints from their message.

${memoryContext}

CRITICAL RULES FOR DESTINATIONS:
1. Exact Destination Focus: If the user asks for a specific place without asking for nearby places (e.g., "Bangalore", "banglore", "tell me about udupi"), you MUST generate the travel card for THAT exact destination. Do NOT recommend nearby places as the main destination.
2. Local vs Nearby City Intent: If the user explicitly asks for "places near [City]", "tourist attractions in [City]", "best places to visit around [City]", you MUST return local attractions WITHIN or IMMEDIATELY SURROUNDING that city (e.g., for Bangalore: Lalbagh Botanical Garden, Cubbon Park, Bangalore Palace, Nandi Hills, etc.). DO NOT return unrelated destinations from other states (e.g. Kovalam, Goa, Kashmir, Rajasthan) unless explicitly asked.
3. Spelling Auto-Correction: Understand spelling mistakes automatically (e.g., "banglore" -> "Bangalore", "mysor" -> "Mysore", "udpi" -> "Udupi"). Always output the correctly spelled destination.
4. No Hallucinations & Geographic Strictness: Only return real tourist places. Search priority must be: Exact Destination -> Local Attractions -> Nearby Cities -> State Attractions. Never return random fallback results.
5. Contextual Category Clicks: If the user searches for a category (e.g., "🏖 Beaches", "🍽 Seafood", "🏛 Heritage Places"), determine the current destination city from the chat history and return ONLY relevant local places for that category within that specific city. Do NOT return unrelated places (e.g., temples for a beaches query).

DYNAMIC CHIPS:
Whenever you respond with a destination or recommendation, you MUST generate exactly FIVE destination-specific recommendation chips (e.g., "🏛 Heritage Places", "🌳 Parks & Gardens", "🍽 Famous Food"). Include emojis. These must be highly tailored to the current destination and never generic.

MOOD DETECTION:
If the user expresses emotions (e.g., bored, stressed, adventurous), suggest mood-appropriate destinations and set action to "MOOD_SUGGESTION".

ITINERARY GENERATION:
If the user asks for a trip plan or itinerary, generate a structured day-by-day plan with timings, places, and costs. Set action to "GENERATE_ITINERARY".

HIDDEN GEMS:
${communityPlacesContext}
Include these in recommendations if relevant. Set action to "HIDDEN_GEMS" if you are specifically recommending these.

COMPANION MODE:
If the user asks for nearby places (restaurants, hotels, hospitals, ATMs) around a location, set action to "NEARBY_PLACES".

SAFETY INFO:
If the user asks for safety, emergency contacts, or weather warnings, set action to "SAFETY_INFO".

LANGUAGE:
Respond in the language specified by code: "${languageContext}" (en=English, hi=Hindi, kn=Kannada).

IMPORTANT - RELATED PLACES RULE:
For every destination you generate, you MUST provide exactly 5 real, geographically nearby tourist attractions in the 'nearby_places' array.
- Use strict geographic proximity (same district/city/state).
- Never recommend unrelated or random places.

Respond strictly in JSON format ONLY, without markdown backticks. 
Format MUST exactly match this structure:
{
  "reply": "Your conversational reply acknowledging their constraints.",
  "action": "RECOMMENDATION", 
  "dynamic_chips": ["🏛 Heritage Places", "🌳 Parks & Gardens", "🍽 Famous Food", "🛍 Shopping", "🌄 Weekend Trips"],
  "extracted_constraints": {
    "destination": "Bangalore",
    "budget": 15000,
    "days": 5,
    "interests": ["historical", "nature"]
  },
  "travel_cards": [
    {
      "place_name": "Lalbagh Botanical Garden",
      "location": "Bangalore, India",
      "category": "nature",
      "rating": "4.6",
      "reviews": "10k+ reviews",
      "description": "A historic botanical garden with a glasshouse and diverse plant species.",
      "image_url": "", 
      "image_gallery": [],
      "map_url": "https://maps.google.com/?q=Lalbagh+Botanical+Garden+Bangalore",
      "best_time": "Early Morning / Evening",
      "entry_fee": "₹30",
      "distance_from_origin": "5 km from City Center",
      "travel_time": "15 mins",
      "tags": ["Nature", "Garden"],
      "weather": { "temperature": "28°C", "condition": "Sunny" },
      "nearby_places": [
        {
          "name": "Cubbon Park",
          "distance": "3 km",
          "description": "The lung space of Bangalore.",
          "rating": "4.5",
          "best_time": "Year-round",
          "image_url": ""
        }
      ]
    }
  ]
}`;

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
            
            // Hardcode to gemini-flash-latest as 1.5 is returning 404 and 2.0 has quota issues
            const targetModel = "gemini-flash-latest";
            const model = genAI.getGenerativeModel({ model: targetModel });

            const fullMessage = `${systemPrompt}\n\nCHAT HISTORY:\n${history || 'No previous history.'}\n\nUSER MESSAGE:\n${message}`;
            const result = await model.generateContent(fullMessage);
            
            let rawText = result.response.text();
            
            if (rawText) {
                rawText = rawText.trim();
                // Strip markdown backticks if Gemini accidentally includes them
                if (rawText.startsWith('```json')) rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                else if (rawText.startsWith('```')) rawText = rawText.replace(/```/g, '').trim();
                
                let aiResult = { reply: rawText, action: "NONE", destinationName: null };
                try {
                    aiResult = JSON.parse(rawText);
                    
                    if (userId && aiResult.memory_updates) {
                        const UserPreferences = require('../models/UserPreferences');
                        let prefs = await UserPreferences.findOne({ userId });
                        if (!prefs) {
                            prefs = new UserPreferences({ userId });
                        }
                        // AI output is never written to Mongo as-is: only the four
                        // known preference fields are read, values are type- and
                        // enum-checked, and every list is length-capped.
                        const updates = (aiResult.memory_updates && typeof aiResult.memory_updates === 'object')
                            ? aiResult.memory_updates : {};

                        if (Array.isArray(updates.favoriteDestinations)) {
                            const clean = updates.favoriteDestinations
                                .filter(d => typeof d === 'string')
                                .map(d => d.trim().slice(0, 120))
                                .filter(Boolean);
                            if (clean.length) {
                                prefs.favoriteDestinations = [...new Set([...(prefs.favoriteDestinations || []), ...clean])].slice(0, 100);
                            }
                        }
                        if (['budget', 'mid-range', 'luxury'].includes(updates.budgetPreference)) {
                            prefs.budgetPreference = updates.budgetPreference;
                        }
                        if (Array.isArray(updates.travelStyle)) {
                            const clean = updates.travelStyle
                                .filter(t => typeof t === 'string')
                                .map(t => t.trim().slice(0, 60))
                                .filter(Boolean);
                            if (clean.length) {
                                prefs.travelStyle = [...new Set([...(prefs.travelStyle || []), ...clean])].slice(0, 50);
                            }
                        }
                        if (['veg', 'non-veg', 'both'].includes(updates.dietaryPreference)) {
                            prefs.dietaryPreference = updates.dietaryPreference;
                        }
                        if (typeof updates.mood === 'string' && updates.mood.trim()) {
                            prefs.moodHistory.push({ mood: updates.mood.trim().slice(0, 60), date: new Date() });
                            if (prefs.moodHistory.length > 200) {
                                prefs.moodHistory = prefs.moodHistory.slice(-200);
                            }
                        }

                        await prefs.save();
                    }
                    
                    // FIX IMAGES: ALWAYS use real DB images over AI-generated ones
                    if (aiResult.travel_cards && Array.isArray(aiResult.travel_cards)) {
                        for (let i = 0; i < aiResult.travel_cards.length; i++) {
                            const card = aiResult.travel_cards[i];
                            let placeNameForImage = card.place_name || 'Destination';
                            let cityContext = (aiResult.extracted_constraints && aiResult.extracted_constraints.destination) ? aiResult.extracted_constraints.destination : '';
                            
                            // If the placeName doesn't already contain the city name, append it for better image matching
                            if (cityContext && !placeNameForImage.toLowerCase().includes(cityContext.toLowerCase())) {
                                placeNameForImage = `${placeNameForImage} ${cityContext}`;
                            }
                            
                            const cardAttractions = Array.isArray(card.nearby_places)
                                ? card.nearby_places.map(np => np && np.name).filter(Boolean)
                                : [];
                            const realImage = await resolveDestinationImage(placeNameForImage, cardAttractions);
                            card.image_url = realImage.image_url;
                            card.image_gallery = realImage.image_gallery;

                            if (card.nearby_places && Array.isArray(card.nearby_places)) {
                                for (let j = 0; j < card.nearby_places.length; j++) {
                                    const np = card.nearby_places[j];
                                    let npNameForImage = np.name;
                                    if (cityContext && !npNameForImage.toLowerCase().includes(cityContext.toLowerCase())) {
                                        npNameForImage = `${npNameForImage} ${cityContext}`;
                                    }
                                    const npRealImage = await resolveDestinationImage(npNameForImage, []);
                                    np.image_url = npRealImage.image_url;
                                }
                            }
                        }
                    }

                } catch (parseErr) {
                    console.log("Gemini did not return valid JSON. Falling back to raw text:", parseErr.message);
                }
                
                let destination = null;
                let liveWeatherString = "";

                if (aiResult.action === 'START_BOOKING' && aiResult.destinationName) {
                    // Try to find it in the database first
                    destination = await Destination.findOne({ name: { $regex: new RegExp(`^${escapeRegex(aiResult.destinationName)}$`, 'i') } });
                    
                    if (!destination) {
                        console.log(`Global AI generated a new location: ${aiResult.destinationName}. Creating database entry...`);
                        const aiPrice = Number(aiResult.destinationPrice);
                        destination = new Destination({
                            name: cleanString(aiResult.destinationName, 200),
                            location: cleanString(aiResult.destinationLocation, 200) || "Global Destination",
                            category: ["beach", "mountain", "historical", "cultural", "adventure", "religious", "wildlife"].includes(aiResult.destinationCategory)
                                ? aiResult.destinationCategory : "historical",
                            description: cleanString(aiResult.destinationDescription, 2000) || "A beautiful location discovered by AI.",
                            price: (Number.isFinite(aiPrice) && aiPrice >= 0 && aiPrice <= 10000000) ? aiPrice : 500,
                            imageUrl: "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1000&auto=format&fit=crop"
                        });
                        await destination.save();
                    }

                    // FETCH LIVE WEATHER DATA DYNAMICALLY WITHOUT API KEYS!
                    try {
                        console.log(`Fetching live weather for ${aiResult.destinationName}...`);
                        const weatherRes = await fetch(`https://wttr.in/${encodeURIComponent(aiResult.destinationName)}?format=j1`);
                        const weatherData = await weatherRes.json();
                        
                        const tempC = weatherData.current_condition[0].temp_C;
                        const condition = weatherData.current_condition[0].weatherDesc[0].value;
                        
                        liveWeatherString = `\n\n🌤️ *Live Real-Time Weather in ${aiResult.destinationName}:* ${tempC}°C and ${condition}!`;
                    } catch(e) {
                        console.log("Could not ping weather API.", e.message);
                    }
                }
                
                const finalAiReply = (aiResult.reply || rawText) + liveWeatherString;

                return res.json({
                    reply: finalAiReply,
                    action: aiResult.action,
                    travel_cards: aiResult.travel_cards || []
                });
            }
        } catch (err) {
            if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('RetryInfo'))) {
                console.error("[Gemini API] Rate limit exceeded. (429 Too Many Requests)");
                return res.json({ 
                    reply: "I am receiving too many requests right now! Please wait a few seconds and try asking me again. ⏳", 
                    action: "NONE" 
                });
            } else {
                console.error("Gemini failed, falling back to basic...");
                if (err.status) console.error(`[Gemini Error Status]: ${err.status} - ${err.statusText}`);
                if (err.message) console.error(`[Gemini Error Message]: ${err.message}`);
                try {
                    console.error("FULL RAW ERROR:", JSON.stringify(err, null, 2));
                } catch(e) {
                    console.error("FULL RAW ERROR:", err);
                }
            }
        }
    }

    // --- FALLBACK LOGIC IF NO GEMINI KEY ---
    const { intent, category, text } = getKeywords(message);

    try {
        if (intent === 'greeting') {
            const places = await Destination.find().limit(2);
            let replyText = 'Hi there! 👋 I am your friendly AI Tourist Assistant. I can help you plan your perfect trip! ';
            if (places.length > 0) {
                const sugg = places.map(p => p.name).join(' and ');
                replyText += `Did you know we have beautiful places like ${sugg}? You can ask me to book them, or ask for recommendations by category (beach, mountain, historical)!`;
            } else {
                replyText += `You can ask me to recommend beach, mountain, or historical destinations!`;
            }
            return res.json({ reply: replyText });
        }

        if (intent === 'thanks') {
            return res.json({ reply: 'You are very welcome! 😊 Let me know if you need anything else or want to explore another destination.' });
        }

        if (intent === 'trips') {
            return res.json({ 
                reply: 'Sure! Here are some of our popular trip packages you can add to your cart:',
                action: 'SHOW_TRIPS' 
            });
        }

        if (intent === 'bye') {
            return res.json({ reply: 'Goodbye! Safe travels, and I hope to help you plan another trip soon! ✈️' });
        }

        if (intent === 'booking') {
            const places = await Destination.find();
            let matchedPlace = places.find(p => text.includes(p.name.toLowerCase()));

            if (matchedPlace) {
                return res.json({
                    reply: `Great! You want to book ${matchedPlace.name}. Please enter your details (name, email, travel date, number of people) in the booking form.`,
                    action: 'START_BOOKING',
                    destination: matchedPlace
                });
            } else {
                return res.json({ reply: 'Which place would you like to book? Please provide the name of the destination.' });
            }
        }

        // SMART FALLBACK: Try database search before giving up
        const words = text.split(/\s+/).filter(w => w.length > 2);
        let fuzzyResults = [];
        
        // If category is found, prioritize it in search
        if (category) {
            const categoryMatches = await Destination.find({ category: category });
            fuzzyResults.push(...categoryMatches);
        }

        for (const word of words) {
            const safeWord = escapeRegex(word);
            const found = await Destination.find({ 
                $or: [
                    { name: { $regex: safeWord, $options: 'i' } },
                    { location: { $regex: safeWord, $options: 'i' } }
                ]
            }).limit(20);
            fuzzyResults.push(...found);
        }
        
        // Deduplicate by name and pick the BEST entry (with real images)
        const groupedResults = {};
        for (const p of fuzzyResults) {
            const key = p.name.toLowerCase();
            if (!groupedResults[key]) groupedResults[key] = [];
            groupedResults[key].push(p);
        }
        
        fuzzyResults = [];
        for (const [key, entries] of Object.entries(groupedResults)) {
            // Pick the best match: prefer entries with image_gallery (seeded data)
            const bestMatch = entries.find(d => d.image_gallery && d.image_gallery.length > 0) || entries.find(d => d.imageUrl && !d.imageUrl.includes('placehold.co')) || entries[0];
            fuzzyResults.push(bestMatch);
        }

        if (fuzzyResults.length > 0) {
            // Convert DB results to travel_cards so they render with REAL images
            const travelCards = fuzzyResults.map(p => ({
                place_name: p.name,
                location: p.location,
                category: p.category,
                rating: p.rating ? String(p.rating) : "4.5",
                reviews: "Popular",
                description: p.description,
                image_url: p.imageUrl,
                image_gallery: p.image_gallery && p.image_gallery.length > 0 ? p.image_gallery : [p.imageUrl],
                map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`,
                best_time: p.best_time || "Year-round",
                entry_fee: "Varies",
                tags: [p.category],
                weather: p.weather || { temperature: "25-30°C", condition: "Pleasant" },
                budgets: p.budgets || {},
                hotels: p.hotels || [],
                foods: p.foods || [],
                nearby_attractions: p.nearby_attractions || [],
                itinerary: p.itinerary_3_day || [],
                transport_options: p.transport_options || [],
                packing_list: [],
                _id: p._id
            }));

            // Double check for any bad images in DB and overwrite them with real images
            for (let i = 0; i < travelCards.length; i++) {
                if (!travelCards[i].image_url || travelCards[i].image_url.includes('placehold.co') || travelCards[i].image_url.includes('loremflickr')) {
                    const topAttractions = travelCards[i].top_attractions || travelCards[i].nearby_attractions || [];
                    const realImage = await resolveDestinationImage(travelCards[i].place_name, topAttractions);
                    travelCards[i].image_url = realImage.image_url;
                    travelCards[i].image_gallery = realImage.image_gallery;
                }
            }

            let replyText = `Here are the destinations matching "${message}":`;
            return res.json({ 
                reply: replyText, 
                action: 'RECOMMENDATION',
                travel_cards: travelCards 
            });
        }

        // For truly unknown locations — return a card WITHOUT saving to DB
        const locName = message.trim();
        const formattedName = locName.charAt(0).toUpperCase() + locName.slice(1);

        // Fetch real image using imageService
        const realImage = await resolveDestinationImage(formattedName);
        let fallbackImageUrl = realImage.image_url;

        const mockCard = {
            place_name: formattedName,
            location: formattedName + ", India",
            category: "cultural",
            rating: "4.5",
            reviews: "New",
            description: `Explore the amazing destination of ${formattedName}. Ask me for more details or try another location!`,
            image_url: fallbackImageUrl,
            image_gallery: [fallbackImageUrl],
            map_url: `https://maps.google.com/?q=${encodeURIComponent(locName)}`,
            best_time: "Year round",
            entry_fee: "Varies",
            tags: ["Explore", "Travel"],
            weather: {
                temperature: "25°C",
                condition: "Pleasant"
            },
            budgets: {
                "5_days": "₹15000"
            }
        };

        return res.json({ 
            reply: `Here's what I found for ${formattedName}! Check out this overview:`,
            action: 'RECOMMENDATION',
            travel_cards: [mockCard]
        });

    } catch (err) {
        res.status(500).json({ reply: 'Oops! Something went wrong on my end.' });
    }
});

// GET /api/chat/history - Retrieve user's persisted chat history
const User = require('../models/User');

router.get('/history', auth, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('chatHistory').lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ chatHistory: user.chatHistory || [] });
}));

// POST /api/chat/history - Save user's updated chat history
router.post('/history', auth, asyncHandler(async (req, res) => {
    const incoming = Array.isArray(req.body.chatHistory) ? req.body.chatHistory : [];
    // Cap what a client can persist onto their own document.
    const chatHistory = incoming.slice(-MAX_STORED_HISTORY_ITEMS).map(item => ({
        sender: cleanString(item?.sender, 20),
        text: cleanString(item?.text, MAX_CHAT_MESSAGE_LENGTH),
    }));

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { chatHistory } },
        { new: true }
    ).select('chatHistory');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({ msg: 'Chat history updated successfully', chatHistory: user.chatHistory });
}));

// ─────────────────────────────────────────────
// Saved chats — every operation is scoped to the authenticated owner
// ─────────────────────────────────────────────
const Chat = require('../models/Chat');
const Message = require('../models/Message');

/** Fetches a chat only when it belongs to the caller. */
async function loadOwnedChat(chatId, req, res) {
    const chat = await Chat.findOne({ _id: chatId, isDeleted: { $ne: true } });
    if (!chat) {
        res.status(404).json({ msg: 'Chat not found' });
        return null;
    }
    if (String(chat.userId) !== req.user.id) {
        // Same status as "not found" would leak less, but a clear 403 is the
        // documented behaviour for the rest of the project.
        res.status(403).json({ msg: 'Access denied' });
        return null;
    }
    return chat;
}

router.post('/new', auth, asyncHandler(async (req, res) => {
    const newChat = new Chat({
        userId: req.user.id,       // ownership from the token
        title: 'New Conversation'
    });
    await newChat.save();
    res.json(newChat);
}));

// The :userId segment is kept for frontend compatibility but ignored.
router.get('/history/:userId', auth, asyncHandler(async (req, res) => {
    if (req.params.userId && req.params.userId !== req.user.id) {
        return res.status(403).json({ msg: 'Access denied' });
    }
    const chats = await Chat.find({ userId: req.user.id, isDeleted: { $ne: true } })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();
    res.json(chats);
}));

router.get('/:chatId', auth, requireObjectIdParam('chatId'), asyncHandler(async (req, res) => {
    const chat = await loadOwnedChat(req.params.chatId, req, res);
    if (!chat) return;

    const messages = await Message.find({ chatId: chat._id })
        .sort({ timestamp: 1 })
        .limit(1000)
        .lean();
    res.json({ chat, messages });
}));

router.post('/message', auth, asyncHandler(async (req, res) => {
    const chatId = typeof req.body.chatId === 'string' ? req.body.chatId : '';
    if (!chatId || !/^[a-f\d]{24}$/i.test(chatId)) {
        return res.status(400).json({ msg: 'Invalid chat reference' });
    }

    const chat = await loadOwnedChat(chatId, req, res);
    if (!chat) return;

    const sender = ['user', 'ai', 'bot'].includes(req.body.sender) ? req.body.sender : null;
    if (!sender) return res.status(400).json({ msg: 'Invalid sender' });

    const message = cleanString(req.body.message, MAX_CHAT_MESSAGE_LENGTH);
    if (!message) return res.status(400).json({ msg: 'Message text is required' });

    const newMessage = new Message({
        chatId: chat._id,
        sender,
        message,
        data: Array.isArray(req.body.data) ? req.body.data.slice(0, 50) : [],
        options: Array.isArray(req.body.options) ? req.body.options.slice(0, 50) : [],
        step: cleanString(req.body.step, 60)
    });
    await newMessage.save();

    if (sender === 'user' && chat.title === 'New Conversation') {
        const words = message.split(' ');
        let title = words.slice(0, 4).join(' ');
        if (words.length > 4) title += '...';
        chat.title = title;
    }

    chat.updatedAt = new Date();
    await chat.save();

    res.json(newMessage);
}));

router.put('/rename/:chatId', auth, requireObjectIdParam('chatId'), asyncHandler(async (req, res) => {
    const chat = await loadOwnedChat(req.params.chatId, req, res);
    if (!chat) return;

    const title = cleanString(req.body.title, 120);
    if (!title) return res.status(400).json({ msg: 'Title is required' });

    chat.title = title;
    await chat.save();
    res.json(chat);
}));

router.delete('/:chatId', auth, requireObjectIdParam('chatId'), asyncHandler(async (req, res) => {
    const chat = await loadOwnedChat(req.params.chatId, req, res);
    if (!chat) return;

    chat.isDeleted = true;
    await chat.save();
    res.json({ msg: 'Chat deleted successfully' });
}));

module.exports = router;
