// backend/routes/auth-mobile-routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Adjust the path to go up one level to find the 'models' directory
const Users = require('../models/user-model'); 
const Appointment = require('../models/appointment-model');

const router = express.Router();
const ensureApiAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'immacareSecretKey123');
        req.user = decoded; // Attaches { userId: '...' } to the request
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
};
/**
 * @route   POST /api/auth/mobile-register
 * @desc    Handle user registration from the mobile app.
 * @access  Public
 */
router.post('/mobile-register', async (req, res) => {
    // 1. Get the data from the mobile app's request body
    const { name, email, password, age, mobile, address, gender } = req.body;

    // --- START OF THE FIX ---
    // These validations are now consistent with the web version
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (mobile && mobile.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ message: "Please enter a valid phone number (at least 10 digits)" });
    }
    // You could add password complexity checks here too if desired
    // --- END OF THE FIX ---

    try {
        if (await Users.findOne({ signupEmail: email })) {
            return res.status(409).json({ message: "Email already registered." });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // This logic correctly handles the 'name' field from the mobile app
        const nameParts = name.trim().split(' ');
        const firstName = nameParts.shift(); // Takes the first part
        const lastName = nameParts.join(' '); // Joins the rest

        // --- THE KEY CHANGE IS HERE ---
        // We create the user with the exact same field names as auth-routes.js
        const user = new Users({
            firstName,      // from 'name'
            lastName,       // from 'name'
            signupEmail: email,
            Age: age,
            Sex: gender,    // 'Sex' matches the web registration field
            PhoneNumber: mobile, // 'PhoneNumber' matches the web registration field
            Address: address,
            signupPassword: hashedPassword,
            isVerified: true // Mobile users are auto-verified
        });
        
        await user.save();

        console.log("✅ Mobile user registered with consistent data:", user.fullname);
        res.status(201).json({ message: "Registration successful! You can now log in." });

    } catch (error) {
        console.error("Mobile registration error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/**
 * @route   POST /api/auth/mobile-login
 * @desc    Handle user login from the mobile app and return a JWT.
 * @access  Public
 */
router.post('/mobile-login', async (req, res) => {
    // This route is already fine and does not need changes.
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ signupEmail: email });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.signupPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const payload = {
            userId: user._id,
            name: user.fullname,
            email: user.signupEmail,
            isAdmin: user.isAdmin,
            isDoctor: user.isDoctor,
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'immacareSecretKey123',
            { expiresIn: '30d' }
        );

        console.log(`✅ Mobile login success for ${user.signupEmail}.`);
        res.status(200).json({
            message: 'Login successful',
            token: token,
            userData: {
                id: user._id,
                name: user.fullname,
                email: user.signupEmail,
            }
        });

    } catch (error) {
        console.error("❌ Mobile login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

router.get('/appointments', ensureApiAuthenticated, async (req, res) => {
    try {
        // Find appointments using the userId from the JWT token
        const appointments = await Appointment.find({ userId: req.user.userId })
            .populate({
                path: 'doctor',
                select: 'userAccount',
                populate: {
                    path: 'userAccount',
                    select: 'firstName lastName suffix'
                }
            })
            .populate('specialization', 'name')
            .sort({ date: -1, time: -1 });

        if (!appointments) {
            return res.json([]);
        }
        
        // The mobile app is already using optional chaining, so we can send the data as is.
        // This is more efficient than transforming it on the server.
        res.json(appointments);

    } catch (error) {
        console.error("Error fetching appointments for mobile user:", error);
        res.status(500).json({ message: 'Could not fetch appointments.' });
    }
});

// Also, add a route for deleting/cancelling appointments for mobile
router.delete('/appointments/:appointmentId', ensureApiAuthenticated, async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }
        
        // Security check: Ensure the user from the token owns this appointment
        if (appointment.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: "You are not authorized to cancel this appointment." });
        }
        
        await Appointment.findByIdAndDelete(appointmentId);
        res.status(200).json({ message: "Appointment cancelled successfully." });

    } catch (error) {
        console.error("Error cancelling mobile appointment:", error)
        res.status(500).json({ message: "Error cancelling appointment." });
    }
});


module.exports = router;