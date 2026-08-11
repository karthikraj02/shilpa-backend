require('dotenv').config();
const { sendReceiptEmail } = require('./services/receiptService'); 
sendReceiptEmail({ 
    _id: '12345', 
    email: 'shilpaaaa121@gmail.com', 
    name: 'Shilpa', 
    status: 'Confirmed', 
    destinationObj: { name: 'Test Destination' }, 
    totalCost: 5000, 
    travelers: [{name: 'Shilpa', age: 25, gender: 'Female', mobile: '9999999999'}] 
}).then(res => console.log('Result:', res));
