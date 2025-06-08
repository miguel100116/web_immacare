// backend/routes/user-mobile-routes.js
const express = require('express');
const jwt = require('jsonwebtoken'); // Import JWT library
const Users = require('../models/user-model');
const Appointment = require('../models/appointment-model');
const router = express.Router();

// --- 1. JWT Authentication Middleware ---
// This function will protect all routes in this file. It checks for a valid
// token and attaches the user's info to the request.
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

// --- 2. Corrected Profile Routes (with middleware) ---

// GET /api/user/profile - Get the logged-in user's profile
// This route is now protected.
router.get('/profile', ensureApiAuthenticated, async (req, res) => {
    try {
        const userProfile = await Users.findById(req.user.userId).select('-signupPassword');
        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(userProfile);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// PUT /api/user/profile - Update the logged-in user's profile
// THIS IS THE CORRECTED LOGIC
router.put('/profile', ensureApiAuthenticated, async (req, res) => {
    try {
        // Destructure the correct fields sent by the mobile app
        const { firstName, lastName, suffix, signupEmail, PhoneNumber, Address, Age } = req.body;
        
        // Build the data object to update in the database
        const updatedData = {
            firstName,
            lastName,
            suffix,
            signupEmail,
            PhoneNumber,
            Address,
            Age,
        };

        // Find the user by ID and update their document
        const updatedUser = await Users.findByIdAndUpdate(req.user.userId, updatedData, { new: true })
            .select('-signupPassword');
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found to update.' });
        }
        
        // Send the updated user data back to the app
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

// --- 3. Corrected Appointments Route (with middleware) ---

// POST /api/user/appointments - Create a new appointment
// This route is now also protected.
router.post('/appointments', ensureApiAuthenticated, async (req, res) => {
    try {
        const { doctor, specialization, date, time, reason } = req.body;
        
        const patientInfo = await Users.findById(req.user.userId);
        
        const newAppointment = new Appointment({
            doctor,
            specialization,
            date,
            time,
            reason,
            patientName: patientInfo.fullname,
            patientEmail: patientInfo.signupEmail,
            address: patientInfo.Address,
            age: patientInfo.Age,
            phone: patientInfo.PhoneNumber,
            userId: req.user.userId,
            status: 'Scheduled',
        });

        await newAppointment.save();
        res.status(201).json({ message: 'Appointment created successfully.', appointment: newAppointment });
    } catch (error) {
        console.error("Error creating mobile appointment:", error);
        res.status(500).json({ message: 'Could not create appointment.' });
    }
});

module.exports = router;