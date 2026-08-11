const mongoose = require('mongoose');
const TripPlan = require('./models/TripPlan');

mongoose.connect('mongodb://localhost:27017/ai-tourist').then(async () => {
  await TripPlan.deleteMany({});
  
  const trips = [
    {
      destination: 'Goa',
      state: 'Goa',
      category: 'Beach Getaway',
      duration: '5 Days / 4 Nights',
      price: 18500,
      discount: 15,
      heroImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&fit=crop',
        'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&fit=crop',
        'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&fit=crop'
      ],
      rating: 4.8,
      reviewCount: 324,
      description: 'Soak in golden beaches, vibrant nightlife, and fresh seafood on India\'s most famous coastline.',
      attractions: ['Baga Beach', 'Fort Aguada', 'Dudhsagar Falls', 'Spice Plantation'],
      bestTime: 'November to February',
      transport: 'Flight Included',
      hotel: '4-Star Beach Resort',
      meals: 'Breakfast Included',
      cancellationPolicy: 'Free cancellation 72 hours prior',
      seatsLeft: 5,
      weather: '28°C, Sunny',
      itinerary: [
        { day: 1, title: 'Arrival', activities: ['Check-in to resort', 'Relax at Baga Beach'] },
        { day: 2, title: 'Heritage Tour', activities: ['Visit Fort Aguada', 'Mandovi River Cruise'] },
        { day: 3, title: 'Adventure Day', activities: ['Dudhsagar Waterfalls trip'] },
        { day: 4, title: 'Spice Tour', activities: ['Spice Plantation tour', 'Night Market'] },
        { day: 5, title: 'Departure', activities: ['Transfer to airport'] }
      ]
    },
    {
      destination: 'Rajasthan (Jaipur + Udaipur + Jodhpur)',
      state: 'Rajasthan',
      category: 'Heritage Tour',
      duration: '7 Days / 6 Nights',
      price: 32000,
      discount: 10,
      heroImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1615836245337-f839dff0a153?w=800&fit=crop',
        'https://images.unsplash.com/photo-1588602933458-38cbda50bb55?w=800&fit=crop'
      ],
      rating: 4.9,
      reviewCount: 512,
      description: 'Explore the majestic forts, palaces and vibrant culture of the royal land of Rajasthan.',
      attractions: ['Amber Fort', 'Lake Pichola', 'Mehrangarh Fort', 'Hawa Mahal'],
      bestTime: 'October to March',
      transport: 'Private AC Cab',
      hotel: 'Premium Heritage Havelis',
      meals: 'Breakfast & Dinner',
      cancellationPolicy: 'Non-refundable within 7 days',
      seatsLeft: 2,
      weather: '25°C, Pleasant',
      itinerary: [
        { day: 1, title: 'Welcome to Jaipur', activities: ['Arrive in Jaipur', 'Hawa Mahal'] },
        { day: 2, title: 'Jaipur Forts', activities: ['Amber Fort', 'City Palace'] },
        { day: 3, title: 'On to Jodhpur', activities: ['Drive to Jodhpur', 'Local market'] },
        { day: 4, title: 'Blue City', activities: ['Mehrangarh Fort', 'Umaid Bhawan'] },
        { day: 5, title: 'Udaipur Lakes', activities: ['Drive to Udaipur', 'Sunset boat ride'] },
        { day: 6, title: 'Palaces of Udaipur', activities: ['City Palace', 'Jag Mandir'] },
        { day: 7, title: 'Departure', activities: ['Shopping', 'Departure'] }
      ]
    },
    {
      destination: 'Manali & Leh-Ladakh',
      state: 'Himachal & Ladakh',
      category: 'Mountain Adventure',
      duration: '10 Days / 9 Nights',
      price: 45000,
      discount: 5,
      heroImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&fit=crop',
        'https://images.unsplash.com/photo-1617307994840-7e1e793eddd7?w=800&fit=crop'
      ],
      rating: 4.7,
      reviewCount: 218,
      description: 'Conquer snow-capped peaks, ride through mountain passes and witness breathtaking Himalayan landscapes.',
      attractions: ['Rohtang Pass', 'Pangong Lake', 'Spiti Valley', 'Khardung La'],
      bestTime: 'May to September',
      transport: '4x4 SUV Included',
      hotel: 'Campsites & Premium Hotels',
      meals: 'All Meals Included',
      cancellationPolicy: 'Free cancellation up to 48 hours before',
      seatsLeft: 8,
      weather: '10°C, Cold',
      itinerary: [
        { day: 1, title: 'Arrival in Manali', activities: ['Check-in', 'Acclimatization'] },
        { day: 2, title: 'Rohtang Pass', activities: ['Drive across Rohtang'] },
        { day: 3, title: 'Keylong / Jispa', activities: ['Stay in Jispa'] },
        { day: 4, title: 'Enter Ladakh', activities: ['Cross Baralacha La'] },
        { day: 5, title: 'Leh Arrival', activities: ['Reach Leh', 'Rest'] },
        { day: 6, title: 'Leh Sightseeing', activities: ['Shanti Stupa', 'Magnetic Hill'] },
        { day: 7, title: 'Pangong Tso', activities: ['Day trip to Pangong Lake'] },
        { day: 8, title: 'Nubra Valley', activities: ['Cross Khardung La'] },
        { day: 9, title: 'Return to Leh', activities: ['Camel Safari', 'Return to Leh'] },
        { day: 10, title: 'Departure', activities: ['Fly out of Leh'] }
      ]
    },
    {
      destination: 'Jim Corbett & Ranthambore',
      state: 'Uttarakhand & Rajasthan',
      category: 'Wildlife Safari',
      duration: '6 Days / 5 Nights',
      price: 27000,
      discount: 0,
      heroImage: 'https://images.unsplash.com/photo-1534152063063-e380fb14dfa3?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&fit=crop',
        'https://images.unsplash.com/photo-1582046467026-6db8e4d3db9b?w=800&fit=crop'
      ],
      rating: 4.6,
      reviewCount: 156,
      description: 'Spot tigers, elephants and exotic birds in their natural habitat at India\'s premier wildlife reserves.',
      attractions: ['Tiger Safari', 'Jeep Safari', 'Bird Watching', 'Jungle Camp Stay'],
      bestTime: 'November to May',
      transport: 'Train & Jungle Jeep',
      hotel: 'Luxury Jungle Resorts',
      meals: 'All Meals Included',
      cancellationPolicy: 'Free cancellation up to 7 days before',
      seatsLeft: 12,
      weather: '22°C, Pleasant',
      itinerary: [
        { day: 1, title: 'Arrival in Corbett', activities: ['Check-in to jungle resort', 'Nature walk'] },
        { day: 2, title: 'Corbett Safari', activities: ['Early morning tiger safari', 'Evening safari'] },
        { day: 3, title: 'Transit to Ranthambore', activities: ['Travel via train to Sawai Madhopur'] },
        { day: 4, title: 'Ranthambore Fort', activities: ['Visit historic fort inside the park'] },
        { day: 5, title: 'Ranthambore Safari', activities: ['Full day wildlife spotting in Zones 1-5'] },
        { day: 6, title: 'Departure', activities: ['Checkout and departure'] }
      ]
    },
    {
      destination: 'Andaman Islands',
      state: 'Andaman & Nicobar',
      category: 'Couple Retreat',
      duration: '6 Days / 5 Nights',
      price: 35000,
      discount: 10,
      heroImage: 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&fit=crop',
        'https://images.unsplash.com/photo-1610996843657-3f5f3e493fbe?w=800&fit=crop'
      ],
      rating: 4.9,
      reviewCount: 289,
      description: 'The perfect romantic getaway with crystal clear waters, scuba diving, and secluded white sand beaches.',
      attractions: ['Radhanagar Beach', 'Scuba Diving', 'Cellular Jail', 'Havelock Island'],
      bestTime: 'October to May',
      transport: 'Ferry & Flight',
      hotel: '5-Star Beachfront Resort',
      meals: 'Breakfast & Candlelight Dinner',
      cancellationPolicy: 'Free cancellation up to 14 days before',
      seatsLeft: 4,
      weather: '29°C, Tropical',
      itinerary: [
        { day: 1, title: 'Port Blair', activities: ['Cellular Jail tour', 'Light and Sound Show'] },
        { day: 2, title: 'Havelock Island', activities: ['Ferry to Havelock', 'Radhanagar Beach sunset'] },
        { day: 3, title: 'Water Sports', activities: ['Scuba diving', 'Snorkeling at Elephant Beach'] },
        { day: 4, title: 'Neil Island', activities: ['Ferry to Neil', 'Relax at Laxmanpur Beach'] },
        { day: 5, title: 'Return to Port Blair', activities: ['Shopping at Aberdeen Bazaar'] },
        { day: 6, title: 'Departure', activities: ['Fly out of Port Blair'] }
      ]
    },
    {
      destination: 'Varanasi & Rishikesh',
      state: 'UP & Uttarakhand',
      category: 'Spiritual Journey',
      duration: '5 Days / 4 Nights',
      price: 16000,
      discount: 20,
      heroImage: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1625482381283-3eb37c093a00?w=800&fit=crop',
        'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&fit=crop'
      ],
      rating: 4.8,
      reviewCount: 432,
      description: 'Experience the mystical Ganga Aarti, ancient temples, and inner peace in the spiritual capitals of India.',
      attractions: ['Ganga Aarti', 'Kashi Vishwanath', 'Triveni Ghat', 'Yoga Retreat'],
      bestTime: 'September to November',
      transport: 'Train & Local Auto',
      hotel: 'Riverside Ashram/Boutique Hotel',
      meals: 'Vegetarian Meals',
      cancellationPolicy: 'Free cancellation up to 48 hours before',
      seatsLeft: 20,
      weather: '24°C, Pleasant',
      itinerary: [
        { day: 1, title: 'Arrive in Varanasi', activities: ['Evening Ganga Aarti at Dashashwamedh Ghat'] },
        { day: 2, title: 'Varanasi Temples', activities: ['Morning boat ride', 'Kashi Vishwanath Temple'] },
        { day: 3, title: 'Travel to Rishikesh', activities: ['Flight/Train to Dehradun', 'Transfer to Rishikesh'] },
        { day: 4, title: 'Yoga & Peace', activities: ['Morning Yoga', 'Triveni Ghat Aarti', 'Beatles Ashram'] },
        { day: 5, title: 'Departure', activities: ['Departure from Dehradun airport'] }
      ]
    },
    {
      destination: 'Ooty & Coonoor',
      state: 'Tamil Nadu',
      category: 'Family Trip',
      duration: '4 Days / 3 Nights',
      price: 19500,
      discount: 5,
      heroImage: 'https://images.unsplash.com/photo-1588806296180-2a316b239ef1?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&fit=crop'
      ],
      rating: 4.5,
      reviewCount: 198,
      description: 'A perfect family escape featuring toy train rides, botanical gardens, and sprawling tea estates in the Nilgiris.',
      attractions: ['Nilgiri Mountain Railway', 'Botanical Garden', 'Ooty Lake', 'Tea Estates'],
      bestTime: 'April to June',
      transport: 'Private Cab + Toy Train',
      hotel: 'Family Resort with Play Area',
      meals: 'Breakfast & Dinner',
      cancellationPolicy: 'Free cancellation up to 5 days before',
      seatsLeft: 10,
      weather: '18°C, Misty',
      itinerary: [
        { day: 1, title: 'Arrival in Ooty', activities: ['Check-in', 'Evening walk by Ooty Lake'] },
        { day: 2, title: 'Ooty Sightseeing', activities: ['Botanical Garden', 'Doddabetta Peak'] },
        { day: 3, title: 'Coonoor via Toy Train', activities: ['Nilgiri Mountain Railway to Coonoor', 'Sim\'s Park', 'Dolphin\'s Nose'] },
        { day: 4, title: 'Departure', activities: ['Tea factory visit', 'Departure'] }
      ]
    },
    {
      destination: 'Gokarna & Murudeshwar',
      state: 'Karnataka',
      category: 'Friends Trip',
      duration: '3 Days / 2 Nights',
      price: 8500,
      discount: 0,
      heroImage: 'https://images.unsplash.com/photo-1590766940554-634a7ed41450?w=800&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1582650837584-1845f4fa6e3d?w=800&fit=crop'
      ],
      rating: 4.7,
      reviewCount: 567,
      description: 'Budget-friendly beach hopping, beachside shacks, and a towering Shiva statue overlooking the Arabian sea.',
      attractions: ['Om Beach', 'Kudle Beach', 'Murudeshwar Temple', 'Cafe Hopping'],
      bestTime: 'October to March',
      transport: 'Sleeper Bus included',
      hotel: 'Beachfront Hostels/Shacks',
      meals: 'Breakfast Only',
      cancellationPolicy: 'Non-refundable',
      seatsLeft: 15,
      weather: '29°C, Sunny',
      itinerary: [
        { day: 1, title: 'Beach Trek', activities: ['Arrive in Gokarna', 'Trek from Kudle to Om Beach'] },
        { day: 2, title: 'Relax & Cafes', activities: ['Beach sports', 'Cafe hopping', 'Sunset at Half Moon Beach'] },
        { day: 3, title: 'Murudeshwar', activities: ['Drive to Murudeshwar', 'Visit the Shiva Statue', 'Departure'] }
      ]
    }
  ];

  try {
    await TripPlan.insertMany(trips);
    console.log('Seeded 8 trip packages successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding trips:', err);
    process.exit(1);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
