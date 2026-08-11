const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

function getMailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

const sendReviewEmail = async (booking) => {
    const transporter = getMailTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reviewLink = `${frontendUrl}/review/${booking._id}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: booking.email,
        subject: 'How was your trip? We value your feedback!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Welcome back, ${booking.name}!</h2>
                <p style="font-size: 16px; color: #555;">We hope you had a fantastic time on your trip.</p>
                <p style="font-size: 16px; color: #555;">We are always striving to improve our services and would love to hear about your experience. Your feedback helps us and other travelers make better choices.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; border-radius: 5px; font-weight: bold;">Rate & Review Your Trip</a>
                </div>
                
                <p style="font-size: 14px; color: #777; margin-top: 20px;">If the button above doesn't work, you can copy and paste the following link into your browser:</p>
                <p style="font-size: 14px; color: #2563eb; word-break: break-all;">${reviewLink}</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">AI Tourist Assistant &copy; ${new Date().getFullYear()}</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

// Schedule a cron job to run every day at 10:00 AM
// Using a more frequent interval for testing if needed: '0 * * * *'
cron.schedule('0 10 * * *', async () => {
    console.log('Running scheduled cron job: Checking for completed trips to send review emails...');
    try {
        const today = new Date();
        // A trip is considered ended if returnDate has passed, or if travelDate is 1 day ago (if no returnDate)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const bookingsToReview = await Booking.find({
            status: { $in: ['Confirmed', 'Success'] },
            reviewEmailSent: false,
            $or: [
                { returnDate: { $lt: today, $ne: null } },
                { returnDate: null, travelDate: { $lt: yesterday } }
            ]
        });

        console.log(`Found ${bookingsToReview.length} completed bookings that need review emails.`);

        for (const booking of bookingsToReview) {
            try {
                await sendReviewEmail(booking);
                booking.reviewEmailSent = true;
                await booking.save();
                console.log(`Successfully sent review email for booking ${booking._id}`);
            } catch (emailErr) {
                console.error(`Failed to send review email for booking ${booking._id}:`, emailErr);
            }
        }
    } catch (err) {
        console.error('Error during review email cron job:', err);
    }
});

module.exports = {
    // Exporting for manual testing/triggering if needed
    triggerReviewEmails: async () => {
        console.log('Manually triggering review emails...');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const bookingsToReview = await Booking.find({
            status: { $in: ['Confirmed', 'Success'] },
            reviewEmailSent: false,
            $or: [
                { returnDate: { $lt: today, $ne: null } },
                { returnDate: null, travelDate: { $lt: yesterday } }
            ]
        });

        for (const booking of bookingsToReview) {
            await sendReviewEmail(booking);
            booking.reviewEmailSent = true;
            await booking.save();
        }
        return bookingsToReview.length;
    }
};
