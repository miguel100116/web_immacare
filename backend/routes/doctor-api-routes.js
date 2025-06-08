// backend/routes/doctor-api-routes.js
const express = require('express');
const Appointment = require('../models/appointment-model');
const Doctor = require('../models/doctor-model');
const router = express.Router();
const mongoose = require('mongoose'); // <-- Add mongoose for ID validation

/**
 * @route   GET /api/doctor/appointments
 * @desc    Get all appointments assigned to the currently logged-in doctor
 * @access  Protected (Doctor only)
 */
router.get('/appointments', async (req, res) => {
    try {
        // Find the Doctor profile linked to the logged-in user
        const doctorProfile = await Doctor.findOne({ userAccount: req.session.user.id });
        if (!doctorProfile) {
            return res.status(404).json({ error: "Doctor profile not found for this user." });
        }

        // Find all appointments assigned to this doctor's ID
        const appointments = await Appointment.find({ doctor: doctorProfile._id })
            .sort({ date: 1, time: 1 }); // Sort by soonest

        res.json(appointments);

    } catch (error) {
        console.error("Error fetching appointments for doctor:", error);
        res.status(500).json({ error: "Server error while fetching appointments." });
    }
});

// --- NEW ROUTES FOR PROFILE MANAGEMENT ---

/**
 * @route   GET /api/doctor/profile
 * @desc    Get the profile details for the logged-in doctor
 * @access  Protected (Doctor only)
 */
router.get('/profile', async (req, res) => {
    try {
        const doctorProfile = await Doctor.findOne({ userAccount: req.session.user.id })
            .populate('specialization', 'name')
            // Populate the userAccount to get name details ---
            .populate('userAccount', 'firstName lastName suffix');

        if (!doctorProfile) {
            return res.status(404).json({ error: "Doctor profile not found." });
        }
        res.json(doctorProfile);

    } catch (error) {
        console.error("Error fetching doctor profile:", error);
        res.status(500).json({ error: "Server error while fetching profile." });
    }
});

/**
 * @route   PUT /api/doctor/profile
 * @desc    Update the profile for the logged-in doctor
 * @access  Protected (Doctor only)
 */
router.put('/profile', async (req, res) => {
    try {
        // Destructure all fields from the form ---
        const { specialization, description, firstName, lastName, suffix } = req.body;

        // --- Basic validation ---
        if (!specialization || !mongoose.Types.ObjectId.isValid(specialization)) {
            return res.status(400).json({ error: 'A valid specialization must be selected.' });
        }
        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'First and Last name are required.' });
        }
        if (description.length > 500) {
            return res.status(400).json({ error: 'Description cannot exceed 500 characters.' });
        }

        // --- Update TWO documents: Doctor profile and User profile ---
        
        // 1. Find the Doctor profile
        const doctorProfile = await Doctor.findOne({ userAccount: req.session.user.id });
        if (!doctorProfile) {
            return res.status(404).json({ error: "Doctor profile not found." });
        }

        // 2. Update and save the Doctor-specific fields
        doctorProfile.specialization = specialization;
        doctorProfile.description = description;
        await doctorProfile.save();

        // 3. Update and save the User-specific name fields
        const userProfile = await Users.findById(req.session.user.id);
        if (!userProfile) {
             return res.status(404).json({ error: "Associated user account not found." });
        }
        userProfile.firstName = firstName;
        userProfile.lastName = lastName;
        userProfile.suffix = suffix;
        await userProfile.save();

        // 4. Update the name in the session
        req.session.user.fullname = userProfile.fullname;
        await req.session.save();

        res.json({ message: 'Profile updated successfully!' });

    } catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).json({ error: "Server error while updating profile." });
    }
});

router.put('/schedule', async (req, res) => {
    try {
        const structuredSchedule = req.body.schedules;

        const flatScheduleForDB = [];
        if (Array.isArray(structuredSchedule)) {
            structuredSchedule.forEach(dayInfo => {
                dayInfo.timeSlots.forEach(time => {
                    flatScheduleForDB.push(`${dayInfo.dayOfWeek} - ${time}`);
                });
            });
        }

        const doctorProfile = await Doctor.findOne({ userAccount: req.session.user.id });
        if (!doctorProfile) {
            return res.status(404).json({ error: "Doctor profile not found." });
        }

        doctorProfile.schedules = flatScheduleForDB;


        await doctorProfile.save();

        res.json({ message: 'Schedule updated successfully!' });

    } catch (error) {
        // This catch block is what's currently being triggered.
        // With the fix above, it should no longer happen for this reason.
        console.error("Error updating doctor schedule:", error);
        res.status(500).json({ error: "Server error while updating schedule." });
    }
});


module.exports = router;