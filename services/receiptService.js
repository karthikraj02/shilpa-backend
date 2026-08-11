const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

function getMailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

function generatePDFBuffer(booking) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            
            // Header
            doc.fontSize(20).text('AI Tourist Assistant', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text('Booking Receipt & Package Details', { align: 'center' });
            doc.moveDown(2);
            
            // Booking Summary
            doc.fontSize(12).text(`Booking ID: ${booking._id}`);
            doc.text(`Date: ${new Date(booking.createdAt || Date.now()).toLocaleDateString()}`);
            doc.text(`Status: ${booking.status}`);
            doc.text(`Payment Method: ${booking.payment?.method || 'Online'}`);
            doc.moveDown();
            
            // Destination Details
            if (booking.destinationObj) {
                doc.fontSize(14).text('Destination Details', { underline: true });
                doc.fontSize(12).text(`Name: ${booking.destinationObj.name || booking.destinationObj.place_name || 'N/A'}`);
                doc.text(`Location: ${booking.destinationObj.location || 'N/A'}`);
                doc.text(`Category: ${booking.destinationObj.category || 'N/A'}`);
                doc.moveDown();
            }
            
            // Travelers
            if (booking.travelers && booking.travelers.length > 0) {
                doc.fontSize(14).text('Travelers', { underline: true });
                booking.travelers.forEach((t, i) => {
                    doc.fontSize(12).text(`${i + 1}. ${t.name} (Age: ${t.age}, Gender: ${t.gender}) - Mobile: ${t.mobile}`);
                });
                doc.moveDown();
            }
            
            // Pricing Breakdown
            if (booking.pricingBreakdown) {
                doc.fontSize(14).text('Pricing Breakdown', { underline: true });
                doc.fontSize(12).text(`Base Price: Rs. ${booking.pricingBreakdown.basePrice || 0}`);
                if (booking.pricingBreakdown.transportCost) doc.text(`Transport Cost: Rs. ${booking.pricingBreakdown.transportCost}`);
                if (booking.pricingBreakdown.stayCost) doc.text(`Stay Cost: Rs. ${booking.pricingBreakdown.stayCost}`);
                if (booking.pricingBreakdown.foodCost) doc.text(`Food Cost: Rs. ${booking.pricingBreakdown.foodCost}`);
                doc.moveDown();
            }
            
            // Total Cost
            doc.fontSize(14).text(`Total Amount Paid: Rs. ${booking.totalCost || 0}`, { underline: true });
            doc.moveDown(2);
            
            // Footer
            doc.fontSize(10).text('Thank you for choosing AI Tourist Assistant!', { align: 'center' });
            
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function sendReceiptEmail(booking) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Skipping email receipt: EMAIL_USER or EMAIL_PASS not configured.');
        return false;
    }
    
    try {
        const userEmail = booking.email || (booking.travelers && booking.travelers[0] && booking.travelers[0].email);
        if (!userEmail) {
            console.warn('Skipping email receipt: No valid email address found on booking.');
            return false;
        }

        const pdfBuffer = await generatePDFBuffer(booking);
        const transporter = getMailTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Your Booking Receipt - ${booking._id}`,
            text: `Dear ${booking.name || 'Traveler'},\n\nThank you for booking with AI Tourist Assistant!\n\nPlease find your booking receipt and complete package details attached to this email.\n\nSafe Travels!\nAI Tourist Assistant Team`,
            attachments: [
                {
                    filename: `Booking_Receipt_${booking._id}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Receipt email sent successfully to ${userEmail}`);
        return true;
    } catch (err) {
        console.error('Error sending receipt email:', err);
        return false;
    }
}

module.exports = {
    sendReceiptEmail
};
