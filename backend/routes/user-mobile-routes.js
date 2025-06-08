// backend/routes/user-mobile-routes.js
const express = require('express');
const Users = require('../models/user-model');
const Appointment = require('../models/appointment-model');
const router = express.Router();

// GET /api/user/profile - Get the logged-in user's profile
// The `ensureApiAuthenticated` middleware runs first. If the token is valid, `req.user` will be available.
router.get('/profile', async (req, res) => {
    try {
        const userProfile = await Users.findById(req.user.userId).select('-signupPassword');
        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        res.json(userProfile);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching profile.' });
    }
});

// PUT /api/user/profile - Update the logged-in user's profile
router.put('/profile', async (req, res) => {
    try {
        const { name, email, mobile, address, age } = req.body;
        const nameParts = name.trim().split(' ');
        
        const updatedData = {
            firstName: nameParts.shift(),
            lastName: nameParts.join(' '),
            signupEmail: email,
            PhoneNumber: mobile,
            Address: address,
            Age: age,
        };

        const updatedUser = await Users.findByIdAndUpdate(req.user.userId, updatedData, { new: true })
            .select('-signupPassword');
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating profile.' });
    }
});

// POST /api/user/appointments - Create a new appointment
router.post('/appointments', async (req, res) => {
    try {
        const { doctor, specialization, date, time, reason } = req.body;
        
        // The middleware gives us the user's details from the token
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
            userId: req.user.userId, // Link the appointment to the user
            status: 'Scheduled',
        });

        await newAppointment.save();
        res.status(201).json({ message: 'Appointment created successfully.', appointment: newAppointment });
    } catch (error) {
        console.error("Error creating mobile appointment:", error);
        res.status(500).json({ error: 'Could not create appointment.' });
    }
});

module.exports = router;