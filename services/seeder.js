const Destination = require('../models/Destination');

const seedDestinationsData = [
  {
    name: 'Goa',
    location: 'Goa, India',
    category: 'beach',
    description: 'A beautiful coastal state in western India, famous for its sandy beaches, vibrant nightlife, Portuguese heritage, and delicious seafood.',
    price: 6500,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Palolem_Beach.jpg/1280px-Palolem_Beach.jpg',
    image_gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Palolem_Beach.jpg/1280px-Palolem_Beach.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Dudhsagar_Falls.jpg/800px-Dudhsagar_Falls.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Church_of_St._Cajetan_%28Goa%29.jpg/1280px-Church_of_St._Cajetan_%28Goa%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Fort_Aguada_Goa.jpg/1280px-Fort_Aguada_Goa.jpg'
    ],
    best_time: 'November to February (Pleasant weather and festival season)',
    weather: { temperature: '28°C', condition: 'Sunny and Warm' },
    distance: '560 km from Bangalore, 600 km from Mumbai',
    attractions: ['Baga Beach', 'Calangute Beach', 'Fort Aguada', 'Basilica of Bom Jesus', 'Dudhsagar Falls'],
    hotels: [
      { name: 'Baga Beach Resort', price_per_night: 4500, rating: 4.6, amenities: ['Free WiFi', 'AC', 'Pool', 'Ocean View'], type: 'luxury' },
      { name: 'Goa Heritage Inn', price_per_night: 2200, rating: 4.2, amenities: ['Free WiFi', 'AC', 'Restaurant'], type: 'budget' },
      { name: 'Calangute Palace', price_per_night: 3000, rating: 4.4, amenities: ['Free WiFi', 'AC', 'Pool'], type: 'mid-range' }
    ],
    transport_options: ['Flight (Dabolim or Mopa airport)', 'Overnight sleeper bus', 'Train (Madgaon or Vasco da Gama station)'],
    budgets: {
      "1_day": "₹4,000",
      "3_days": "₹12,000",
      "1_week": "₹26,000"
    },
    travel_tips: [
      'Rent a scooter or jeep for economical local transport.',
      'Try water sports early in the morning to avoid strong midday sun.',
      'Keep cash handy as many beach shacks do not accept cards.'
    ],
    safety_tips: [
      'Avoid swimming during high tide or post-sunset.',
      'Only use registered cabs or pre-booked taxi apps.',
      'Keep your belongings secure at night beach parties.'
    ],
    nearby_attractions: ['Gokarna (130 km)', 'Dudhsagar Waterfalls (60 km)', 'Karwar (90 km)'],
    foods: ['Fish Curry Rice', 'Chicken Cafreal', 'Bebinca (Goan sweet)', 'Prawn Balchão', 'Feni (local beverage)'],
    itinerary_1_day: [
      { day: 1, title: 'Explore North Goa Beaches & Fort', activities: ['Sunrise walk at Baga beach', 'Traditional Goan breakfast at a beach shack', 'Visit the historical Fort Aguada', 'Water sports at Calangute beach', 'Sunset boat cruise on Mandovi River'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Beaches & Water Sports', activities: ['Relax at Baga & Anjuna beaches', 'Enjoy parasailing and jet skiing', 'Sunset at Curlies beach shack'] },
      { day: 2, title: 'Heritage & Old Goa Churches', activities: ['Visit Basilica of Bom Jesus', 'Explore Se Cathedral', 'Spiritual evening walk in Panaji Latin Quarter'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'North Goa Beach Hopping', activities: ['Baga Beach morning walk', 'Visit Fort Aguada', 'Anjuna Flea Market shopping'] },
      { day: 2, title: 'Old Goa Heritage Tour', activities: ['Explore the ancient churches of Old Goa', 'Lunch at a spice plantation', 'Panjim Latin Quarter (Fontainhas) walk'] },
      { day: 3, title: 'South Goa Stays & Sunset', activities: ['Visit Colva and Palolem beaches', 'Spot dolphins in the morning', 'Quiet dinner by the South Goa shores'] }
    ],
    reviews: [
      { user: 'Amit Sharma', rating: 5, comment: 'Goa is always a blast! Old Goa churches are beautiful and water sports were highly thrilling.' },
      { user: 'Elena Rostova', rating: 4, comment: 'Great beaches and food. Try Fontainhas for lovely photos.' }
    ]
  },
  {
    name: 'Mysore',
    location: 'Karnataka, India',
    category: 'historical',
    description: 'The heritage city and cultural capital of Karnataka, celebrated for its magnificent Mysore Palace, silk sarees, sandalwood, and rich history.',
    price: 3500,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mysore_Palace_Morning.jpg/1280px-Mysore_Palace_Morning.jpg',
    image_gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mysore_Palace_Morning.jpg/1280px-Mysore_Palace_Morning.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mysore_Palace_illuminated.jpg/1280px-Mysore_Palace_illuminated.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Brindavan_Gardens_fountain.jpg/1280px-Brindavan_Gardens_fountain.jpg'
    ],
    best_time: 'October to March (Ideal for sightseeing and Dasara festival)',
    weather: { temperature: '24°C', condition: 'Pleasant and Clear' },
    distance: '150 km from Bangalore',
    attractions: ['Mysore Palace', 'Chamundi Hills', 'Brindavan Gardens', 'Mysore Zoo', 'St. Philomena’s Church'],
    hotels: [
      { name: 'Radisson Blu Plaza', price_per_night: 6000, rating: 4.7, amenities: ['Free WiFi', 'AC', 'Pool', 'Palace View'], type: 'luxury' },
      { name: 'Palace Plaza', price_per_night: 1800, rating: 4.1, amenities: ['Free WiFi', 'AC', 'Restaurant'], type: 'budget' },
      { name: 'Hotel Roopa', price_per_night: 2200, rating: 4.3, amenities: ['Free WiFi', 'AC'], type: 'mid-range' }
    ],
    transport_options: ['Train (KSR Bengaluru to Mysore Junction)', 'Cab/Driving via Bengaluru-Mysuru Expressway', 'Regular KSRTC buses'],
    budgets: {
      "1_day": "₹2,500",
      "3_days": "₹7,500",
      "1_week": "₹16,000"
    },
    travel_tips: [
      'Visit Mysore Palace on Sunday evenings between 7:00 PM and 7:45 PM to see it fully illuminated with 97,000 bulbs.',
      'Start early for Chamundi Hills to beat the crowd and the afternoon heat.',
      'Purchase genuine sandalwood items only from government-approved stores.'
    ],
    safety_tips: [
      'Be cautious of local guides offering tours at suspiciously low prices.',
      'Keep your distance from animals at the Mysore Zoo and avoid feeding them.',
      'Wear conservative clothing when visiting religious sites.'
    ],
    nearby_attractions: ['Srirangapatna (15 km)', 'Ranganathittu Bird Sanctuary (18 km)', 'Nanjangud (23 km)'],
    foods: ['Mysore Pak (famous sweet)', 'Mysore Masala Dosa', 'Mysore Bonda', 'Rava Dosa', 'Bisi Bele Bath'],
    itinerary_1_day: [
      { day: 1, title: 'Royal Heritage Day Tour', activities: ['Climb Chamundi Hills in morning', 'Visit Mysore Palace and admire architecture', 'Stroll through Mysore Zoo', 'Head to Brindavan Gardens for musical fountain show'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Palace & Zoo', activities: ['Explore Mysore Palace', 'Stroll in Mysore Zoo', 'Climb Chamundi Hills for sunset'] },
      { day: 2, title: 'Bird Sanctuary & Gardens', activities: ['Boating at Ranganathittu Bird Sanctuary', 'Visit Srirangapatna Fort', 'Evening at Brindavan Gardens'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Mysore Palaces & Zoo', activities: ['Mysore Palace guided tour', 'St. Philomena’s Church visit', 'Mysore Zoo walk'] },
      { day: 2, title: 'Chamundi Hills & Bird Sanctuary', activities: ['Morning trek/drive to Chamundi Temple', 'Boating at Ranganathittu Bird Sanctuary', 'Brindavan Gardens evening show'] },
      { day: 3, title: 'Heritage & Shopping', activities: ['Visit Jaganmohan Palace Art Gallery', 'Shop for Mysore Silk and Sandalwood oil at Devaraja Market', 'Try local Mysore Masala Dosa places'] }
    ],
    reviews: [
      { user: 'Rajesh K.', rating: 5, comment: 'The Mysore Palace is a masterpiece. Highly recommend taking the audio guide!' },
      { user: 'Sarah Miller', rating: 4.5, comment: 'Very green and clean city. The dosa at Mylari is delicious.' }
    ]
  },
  {
    name: 'Udupi',
    location: 'Karnataka, India',
    category: 'beach',
    description: 'A serene coastal town in Karnataka, famous for its historic Sri Krishna Temple, golden sand beaches, coconut trees, and world-renowned vegetarian cuisine.',
    price: 4000,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Udupi_Sri_Krishna_Temple_3.jpg/1280px-Udupi_Sri_Krishna_Temple_3.jpg',
    image_gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Udupi_Sri_Krishna_Temple_3.jpg/1280px-Udupi_Sri_Krishna_Temple_3.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/St._Mary%27s_Island%2C_Udupi_01.jpg/1280px-St._Mary%27s_Island%2C_Udupi_01.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Malpe_beach_2.JPG/1280px-Malpe_beach_2.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Kapu_beach_lighthouse.jpg/1280px-Kapu_beach_lighthouse.jpg'
    ],
    best_time: 'October to March (Warm and pleasant weather with gentle sea breeze)',
    weather: { temperature: '29°C', condition: 'Sunny and Humid' },
    distance: '400 km from Bangalore, 60 km from Mangalore',
    attractions: ['Sri Krishna Temple', 'Malpe Beach', 'St. Mary’s Island', 'Kapu Lighthouse', 'Delta Beach'],
    hotels: [
      { name: 'Paradise Isle Beach Resort', price_per_night: 5200, rating: 4.5, amenities: ['Free WiFi', 'AC', 'Pool', 'Beachfront'], type: 'luxury' },
      { name: 'Udupi Residency', price_per_night: 1600, rating: 4.2, amenities: ['Free WiFi', 'AC', 'Restaurant'], type: 'budget' },
      { name: 'Hotel Kediyoor', price_per_night: 2500, rating: 4.3, amenities: ['Free WiFi', 'AC'], type: 'mid-range' }
    ],
    transport_options: ['Bus (Overnight KSRTC or private luxury buses)', 'Train (Konkan Railway to Udupi station)', 'Flight (to Mangalore International Airport, then 1h taxi)'],
    budgets: {
      "1_day": "₹3,000",
      "3_days": "₹9,000",
      "1_week": "₹19,000"
    },
    travel_tips: [
      'Take the ferry from Malpe beach to St. Mary’s Island before 11:00 AM to beat the intense afternoon heat.',
      'Check the dress code before entering Sri Krishna Temple (men need to remove shirts).',
      'Visit Delta Beach for peaceful backwaters scenery.'
    ],
    safety_tips: [
      'Basalt rock formations at St. Mary’s Island are extremely slippery. Do not attempt to climb them.',
      'Keep hydrated and carry coconut water to counter humidity.',
      'Do not swim near Kapu Beach without lifeguards present.'
    ],
    nearby_attractions: ['Mangalore (55 km)', 'Murudeshwar (100 km)', 'Kollur Mookambika Temple (75 km)'],
    foods: ['Udupi Masala Dosa', 'Goli Baje (Mangalore Bajji)', 'Neer Dosa with coconut chutney', 'Gadbad Ice Cream (Diana Restaurant)', 'Pathrode'],
    itinerary_1_day: [
      { day: 1, title: 'Temple & Beach Getaway', activities: ['Darshan at Sri Krishna Temple', 'Ferry to St. Mary’s Island from Malpe Beach', 'Walk among unique basalt rock formations', 'Climb Kapu Lighthouse for spectacular sunset views'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Temple & Malpe Beach', activities: ['Visit Sri Krishna Temple', 'Enjoy beach activities at Malpe Beach', 'Ferry to St. Mary’s Island'] },
      { day: 2, title: 'Lighthouse & Backwaters', activities: ['Kapu Beach & Lighthouse climb', 'Kayaking at Delta Beach backwaters', 'Try Gadbad Ice Cream in Udupi town'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Udupi Town & Temples', activities: ['Darshan at Udupi Sri Krishna Temple', 'Explore Anantheshwara and Chandramouleshwara temples', 'Enjoy traditional South Indian meals served on banana leaves'] },
      { day: 2, title: 'Island Adventure & Beaches', activities: ['Ferry to St. Mary’s Island from Malpe', 'Explore shell beaches and basalt rocks', 'Evening at Kapu beach and Lighthouse climb'] },
      { day: 3, title: 'Delta Backwaters & Murudeshwar Trip', activities: ['Drive through scenic Delta Beach backwaters', 'Day trip to Murudeshwar (see world’s 2nd tallest Shiva statue)', 'Dinner back in Udupi'] }
    ],
    reviews: [
      { user: 'Sanjay Hegde', rating: 5, comment: 'St. Mary’s Island is an absolute wonder! Udupi vegetarian food is out of this world.' },
      { user: 'Deepa Rao', rating: 4.8, comment: 'Very peaceful town. Loved Kapu beach lighthouse at sunset.' }
    ]
  },
  {
    name: 'Taj Mahal',
    location: 'Agra, India',
    category: 'historical',
    description: 'An ivory-white marble mausoleum on the Yamuna river, one of the Seven Wonders of the World and a symbol of eternal love built by Emperor Shah Jahan.',
    price: 5000,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1280px-Taj_Mahal_%28Edited%29.jpeg',
    image_gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1280px-Taj_Mahal_%28Edited%29.jpeg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Agra_Fort_-_views_inside_and_outside_%286%29.JPG/1280px-Agra_Fort_-_views_inside_and_outside_%286%29.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Mehtab_Bagh%2C_Agra.jpg/1280px-Mehtab_Bagh%2C_Agra.jpg'
    ],
    best_time: 'October to March (Cool temperature and comfortable sightseeing conditions)',
    weather: { temperature: '26°C', condition: 'Sunny and Clear' },
    distance: '200 km from Delhi',
    attractions: ['Taj Mahal', 'Agra Fort', 'Mehtab Bagh', 'Fatehpur Sikri', 'Itimad-ud-Daulah'],
    hotels: [
      { name: 'The Oberoi Amarvilas', price_per_night: 28000, rating: 4.9, amenities: ['Free WiFi', 'AC', 'Pool', 'Direct view of Taj Mahal'], type: 'luxury' },
      { name: 'Taj Hotel & Convention Centre', price_per_night: 5500, rating: 4.6, amenities: ['Free WiFi', 'AC', 'Rooftop Pool'], type: 'mid-range' },
      { name: 'Radisson Hotel Agra', price_per_night: 4200, rating: 4.4, amenities: ['Free WiFi', 'AC', 'Pool'], type: 'mid-range' }
    ],
    transport_options: ['Train (Gatimaan Express or Shatabdi from Delhi)', 'Cab via Yamuna Expressway (3h drive)', 'Flights to Agra airport (limited)'],
    budgets: {
      "1_day": "₹5,000",
      "3_days": "₹15,000",
      "1_week": "₹32,000"
    },
    travel_tips: [
      'Buy tickets online to bypass the massive queues.',
      'Visit during sunrise to capture the changing colors of marble and beat the daytime crowds.',
      'The Taj Mahal is closed on Fridays.'
    ],
    safety_tips: [
      'Only buy souvenirs from reputable state government emporiums to avoid counterfeits.',
      'Beware of pushy photographers and touts around the monument entrance.',
      'Store your footwear in the locker before climbing the main marble platform.'
    ],
    nearby_attractions: ['Mathura (50 km)', 'Vrindavan (60 km)', 'Bharatpur Bird Sanctuary (55 km)'],
    foods: ['Agra Petha (sweet made of ash gourd)', 'Bedai & Jalebi (traditional breakfast)', 'Mughlai Biryani', 'Korma', 'Shahi Tukda'],
    itinerary_1_day: [
      { day: 1, title: 'Wonders of Agra', activities: ['Sunrise at Taj Mahal', 'Breakfast at Mughlai restaurant', 'Guided tour of Agra Fort', 'Sunset view of Taj Mahal from Mehtab Bagh across the river'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Taj & Fort', activities: ['Sunrise visit to Taj Mahal', 'Explore Agra Fort', 'Watch sunset at Mehtab Bagh'] },
      { day: 2, title: 'Fatehpur Sikri', activities: ['Day trip to historical Fatehpur Sikri (ghost city)', 'Visit Buland Darwaza', 'Shop for local embroidery'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Taj Mahal & Fort Tour', activities: ['Sunrise Taj Mahal exploration', 'Breakfast and local shopping', 'Afternoon at Agra Fort'] },
      { day: 2, title: 'Historical Excursion', activities: ['Drive to Fatehpur Sikri', 'Visit Buland Darwaza and Jama Masjid', 'Evening sunset view from Mehtab Bagh'] },
      { day: 3, title: 'Baby Taj & Agra Markets', activities: ['Visit Tomb of Itimad-ud-Daulah (Baby Taj)', 'Explore Akbar’s Tomb in Sikandra', 'Eat famous Agra Petha and purchase leather crafts'] }
    ],
    reviews: [
      { user: 'Vikram Aditya', rating: 5, comment: 'One of the most beautiful sights in the world. Seeing it in person is magical.' },
      { user: 'Jean Dupont', rating: 5, comment: 'Agra fort is massive, and Taj Mahal was breathtaking. Sunrise visit is worth waking up early!' }
    ]
  },
  {
    name: 'Malibu Beach',
    location: 'California, USA',
    category: 'beach',
    description: 'A famous beachfront city in Los Angeles County, renowned for its clean sandy shores, celebrity homes, and top-tier surfing waves.',
    price: 15500,
    imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&fit=crop',
    image_gallery: [
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&fit=crop'
    ],
    best_time: 'June to September (Warm summer weather ideal for beach activities)',
    weather: { temperature: '24°C', condition: 'Sunny and Breezy' },
    distance: '50 km from Los Angeles Downtown',
    attractions: ['Zuma Beach', 'Malibu Pier', 'El Matador State Beach', 'Point Dume', 'Getty Villa'],
    hotels: [
      { name: 'Malibu Beach Inn', price_per_night: 22000, rating: 4.8, amenities: ['Free WiFi', 'AC', 'Oceanfront balconies', 'Spa'], type: 'luxury' },
      { name: 'The M Malibu', price_per_night: 8500, rating: 4.1, amenities: ['Free WiFi', 'AC', 'Pool'], type: 'mid-range' }
    ],
    transport_options: ['Cab/Car rental via Pacific Coast Highway (PCH)', 'LA Metro Bus Route 134'],
    budgets: {
      "1_day": "₹15,000",
      "3_days": "₹45,000",
      "1_week": "₹95,000"
    },
    travel_tips: [
      'Parking gets packed by 10 AM on weekends; arrive early.',
      'Check out the tide calendars before visiting El Matador sea caves.',
      'Enjoy fresh seafood right off the PCH highway.'
    ],
    safety_tips: [
      'Watch out for rip currents while swimming.',
      'Sunscreen is mandatory as California coastal wind cools down but UV index is high.',
      'Respect private beach signs in residential celebrity areas.'
    ],
    nearby_attractions: ['Santa Monica (20 km)', 'Venice Beach (25 km)', 'Getty Center (30 km)'],
    foods: ['Clam Chowder', 'Fish Tacos', 'Fresh Oysters', 'California Avocado Toast'],
    itinerary_1_day: [
      { day: 1, title: 'Beach & Coastal Walk', activities: ['Walk along Zuma Beach', 'Lunch on Malibu Pier', 'Explore sea caves at El Matador State Beach', 'Sunset view from Point Dume'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Beach Day', activities: ['Surfing at Malibu Lagoon State Beach', 'Stroll on Malibu Pier', 'Sunset at Point Dume'] },
      { day: 2, title: 'Cultural Villa & Sea Caves', activities: ['Visit Getty Villa museum', 'Explore El Matador Beach caves', 'Dine at Nobu Malibu'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Zuma Beach & Pier', activities: ['Sunbathing at Zuma Beach', 'Lunch on Malibu Pier', 'Visit Getty Villa'] },
      { day: 2, title: 'Caves & Cliffs exploration', activities: ['Hike up Point Dume Nature Preserve', 'Relax at El Matador Beach', 'Watch surfers at Surfrider Beach'] },
      { day: 3, title: 'Santa Monica Mountains & Hiking', activities: ['Hike Escondido Falls trail', 'Lunch in Malibu Country Mart', 'Relaxing sunset bonfire by the shore'] }
    ],
    reviews: [
      { user: 'Robert G.', rating: 5, comment: 'El Matador is gorgeous at sunset. Great spots for surfing!' },
      { user: 'Sophia L.', rating: 4, comment: 'Beautiful scenery but parking is expensive and hard to find.' }
    ]
  },
  {
    name: 'Aspen Mountain',
    location: 'Colorado, USA',
    category: 'mountain',
    description: 'A world-famous ski resort mountain in Colorado, known for elite winter sports, luxury chalets, and stunning Rocky Mountain peaks.',
    price: 18500,
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&fit=crop',
    image_gallery: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&fit=crop'
    ],
    best_time: 'December to March (Best snow for skiing), June to August (For mountain hiking)',
    weather: { temperature: '-2°C', condition: 'Snowy and Cold' },
    distance: '350 km from Denver',
    attractions: ['Silver Queen Gondola', 'Maroon Bells', 'Aspen Highlands', 'Snowmass Ski Resort', 'Wheeler Opera House'],
    hotels: [
      { name: 'The Little Nell', price_per_night: 35000, rating: 4.9, amenities: ['Free WiFi', 'Ski-in/Ski-out', 'Pool', 'Luxury Spa'], type: 'luxury' },
      { name: 'Limelight Hotel Aspen', price_per_night: 12000, rating: 4.5, amenities: ['Free WiFi', 'AC', 'Pool', 'Breakfast Included'], type: 'mid-range' }
    ],
    transport_options: ['Flight to Aspen-Pitkin County Airport', 'Shuttle or driving via I-70 W from Denver (4h drive)'],
    budgets: {
      "1_day": "₹18,000",
      "3_days": "₹54,000",
      "1_week": "₹120,000"
    },
    travel_tips: [
      'Book ski lifts and gear rentals weeks in advance during winter peak.',
      'Acclimatize to the altitude (8,000+ feet) for 24 hours before strenuous activity.',
      'Use the free local shuttle bus systems.'
    ],
    safety_tips: [
      'Stay on marked ski trails to avoid avalanches.',
      'Dress in layers and wear thermal wear. Frostbite can occur quickly.',
      'Keep hydrated to prevent altitude sickness.'
    ],
    nearby_attractions: ['Glenwood Hot Springs (65 km)', 'Maroon Bells Scenic Area (16 km)'],
    foods: ['Cheese Fondue', 'Truffle Fries', 'Game Meat (Elk or Venison steak)', 'Hot Toddy'],
    itinerary_1_day: [
      { day: 1, title: 'Skiing & Winter Gondola', activities: ['Take Silver Queen Gondola to the summit', 'Morning skiing at Aspen Mountain', 'Warm lunch at Sundeck restaurant', 'Afternoon skiing/snowboarding', 'Apres-ski drinks in Aspen town'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Skiing Aspen Mountain', activities: ['Ride Gondola up the peak', 'Ski/snowboard down powder trails', 'Dinner at Little Nell'] },
      { day: 2, title: 'Maroon Bells Scenic Hike', activities: ['Morning shuttle to Maroon Bells', 'Hike around Maroon Lake', 'Evening relax at Glenwood Hot Springs'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Aspen Mountain Peak Skiing', activities: ['Full day skiing/boarding', 'Lunch on mountain top', 'Apres-ski drinks'] },
      { day: 2, title: 'Maroon Bells & Town Stroll', activities: ['Maroon Bells scenic photowalk', 'Visit Aspen Art Museum', 'Historic walking tour of Wheeler Opera House'] },
      { day: 3, title: 'Glenwood Hot Springs Day Trip', activities: ['Soak in mineral hot springs in Glenwood Canyon', 'Return for fine dining in Aspen', 'Cozy night by fireplace'] }
    ],
    reviews: [
      { user: 'Charles B.', rating: 5, comment: 'Powder snow was incredible. Gondola views are spectacular!' },
      { user: 'Marie L.', rating: 4.8, comment: 'Very expensive but an unforgettable winter wonderland experience.' }
    ]
  },
  {
    name: 'Colosseum',
    location: 'Rome, Italy',
    category: 'historical',
    description: 'An ancient oval amphitheater in the center of the city of Rome, the largest ancient amphitheater ever built and a marvel of Roman engineering.',
    price: 3800,
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&fit=crop',
    image_gallery: [
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&fit=crop',
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&fit=crop',
      'https://images.unsplash.com/photo-1529260839381-3e727e07f66c?w=800&fit=crop'
    ],
    best_time: 'April to June (Spring weather), September to October (Autumn weather)',
    weather: { temperature: '22°C', condition: 'Sunny and Mild' },
    distance: 'Centrally located in Rome',
    attractions: ['Colosseum Arena', 'Roman Forum', 'Palatine Hill', 'Arch of Constantine'],
    hotels: [
      { name: 'Hotel Palazzo Manfredi', price_per_night: 20000, rating: 4.8, amenities: ['Free WiFi', 'AC', 'Rooftop dining overlooking Colosseum'], type: 'luxury' },
      { name: 'Hotel Forum Rome', price_per_night: 8000, rating: 4.4, amenities: ['Free WiFi', 'AC', 'Terrace Bar'], type: 'mid-range' },
      { name: 'Colosseum Hotel', price_per_night: 4500, rating: 4.2, amenities: ['Free WiFi', 'AC'], type: 'budget' }
    ],
    transport_options: ['Rome Metro (Line B - Colosseo station)', 'Trams and electric buses', 'Walking from city center'],
    budgets: {
      "1_day": "₹4,000",
      "3_days": "₹11,000",
      "1_week": "₹24,000"
    },
    travel_tips: [
      'Purchase the combined Colosseum-Forum-Palatine ticket online weeks in advance.',
      'Take a guided underground tour to see where gladiators waited.',
      'Bring a reusable bottle; Rome has public drinking fountains (Nasoni) with fresh water everywhere.'
    ],
    safety_tips: [
      'Watch out for pickpockets in and around the Metro station and Colosseum crowd.',
      'Avoid people selling selfie sticks or offering to take photos for a fee.',
      'Wear sturdy walking shoes for the uneven cobblestone pathways.'
    ],
    nearby_attractions: ['Trevi Fountain (1.5 km)', 'Pantheon (2 km)', 'Vatican City (4 km)'],
    foods: ['Pasta Carbonara', 'Cacio e Pepe', 'Supplì (fried rice ball)', 'Gelato', 'Roman-style thin pizza'],
    itinerary_1_day: [
      { day: 1, title: 'Imperial Rome Day', activities: ['Guided tour of Colosseum Arena & Underground', 'Walk through the Roman Forum ruins', 'Explore Palatine Hill overlooking Rome', 'Evening walk to the Trevi Fountain and Pantheon'] }
    ],
    itinerary_2_day: [
      { day: 1, title: 'Ancient Rome & Forum', activities: ['Visit Colosseum & Palatine Hill', 'Walk through Roman Forum', 'Gelato break in Trastevere'] },
      { day: 2, title: 'Vatican & Cathedrals', activities: ['Vatican Museums and Sistine Chapel tour', 'St. Peter’s Basilica', 'Sunset at Spanish Steps'] }
    ],
    itinerary_3_day: [
      { day: 1, title: 'Colosseum & Ancient Ruins', activities: ['Colosseum guided tour', 'Roman Forum and Palatine Hill exploration', 'Dinner in historical Monti district'] },
      { day: 2, title: 'Classic Rome Sights', activities: ['Trevi Fountain and Pantheon morning walk', 'Piazza Navona street artists', 'Afternoon at Borghese Gallery and Gardens'] },
      { day: 3, title: 'Vatican City Highlights', activities: ['Vatican Museums and Sistine Chapel', 'St. Peter’s Basilica climb', 'Evening walk in Trastevere for authentic Roman food'] }
    ],
    reviews: [
      { user: 'Francesco M.', rating: 5, comment: 'Stunning piece of history. The guided tour of the Arena floor is highly recommended.' },
      { user: 'Emily Davis', rating: 4.8, comment: 'Palatine hill and Forum are as impressive as Colosseum. Arrive early to beat the heat!' }
    ]
  }
];

async function seedDestinations() {
  try {
    for (const data of seedDestinationsData) {
      // Only insert if the destination does not already exist – never overwrite
      const existing = await Destination.findOne({ name: data.name });
      if (existing) {
        // Skip silently – existing data is preserved as-is
        continue;
      }
      const newDest = new Destination(data);
      await newDest.save();
      console.log(`Inserted seeded destination: ${data.name}`);
    }
    console.log('Seeder process completed successfully.');
  } catch (err) {
    console.error('Error during database seeding:', err.message);
  }
}

module.exports = { seedDestinations };
