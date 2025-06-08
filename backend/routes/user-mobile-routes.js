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