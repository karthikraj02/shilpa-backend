const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Booking = require('./models/Booking');
  const Destination = require('./models/Destination');
  const bookings = await Booking.find({ name: { $in: ['pavan', 'pavi', 'karna', 'karthik', 'k'] } }).populate('destination');
  console.log(JSON.stringify(bookings.map(b => ({ name: b.name, dest: b.destination })), null, 2));
  process.exit(0);
});
