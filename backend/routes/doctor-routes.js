// backend/routes/doctor-routes.js
const express = require('express');
const Doctor = require('../models/doctor-model');
const Specialization = require('../models/specialization-model');
const Appointment = require('../models/appointment-model');
const mongoose = require('mongoose'); // <-- Make sure this import is here
const router = express.Router();

/**
 * @route   GET /api/specializations
 * @desc    Get a list of all specializations
 * @access  Public
 */
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await Specialization.find({ name: { $ne: 'Not Specified' } }).sort('name');
    res.json(specializations);
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ error: 'Failed to retrieve specializations.' });
  }
});

/**
 * @route   GET /api/doctors
 * @desc    Get doctors, filtered by specialization.
 * @access  Public
 */
router.get('/doctors', async (req, res) => {
  try {
    const { specializationId } = req.query;
    let query = { isActive: true };
    if (specializationId) {
      query.specialization = specializationId;
    }
    const doctors = await Doctor.find(query)
      .populate({ path: 'userAccount', select: 'firstName lastName suffix' })
      .populate({ path: 'specialization', select: 'name' })
      .sort('userAccount.fullname');
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching public list of doctors:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor list.' });
  }
});

/**
 * @route   GET /api/booked-times
 * @desc    Get booked time slots for a doctor on a specific date.
 * @access  Public
 */
router.get('/booked-times', async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date are required.' });
    }
    const appointments = await Appointment.find({
      doctor: doctorId,
      date: date,
      status: { $in: ['Scheduled', 'Completed'] }
    });
    const bookedTimes = appointments.map(app => app.time);
    res.json(bookedTimes);
  } catch (error) {
    console.error('Error fetching booked times:', error);
    res.status(500).json({ error: 'Could not fetch booked times.' });
  }
});

// --- NEW ROUTE PASTED HERE (IN THE CORRECT PUBLIC FILE) ---
/**
 * @route   GET /api/schedule/:doctorId  <-- Note: prefix is /api, not /api/doctor
 * @desc    Get the weekly availability for a specific doctor
 * @access  Public (so patients can see it)
 */
router.get('/schedule/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({ error: 'Invalid doctor ID.' });
        }

        const doctor = await Doctor.findById(doctorId).select('schedules');
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found.' });
        }

        // Parse the flat string schedule into a structured object for the frontend
        const structuredSchedule = {
            Monday: [], Tuesday: [], Wednesday: [],
            Thursday: [], Friday: [], Saturday: [], Sunday: []
        };

        doctor.schedules.forEach(scheduleString => {
            const parts = scheduleString.split(' - ');
            if (parts.length === 2) {
                const day = parts[0];
                const time = parts[1];
                if (structuredSchedule.hasOwnProperty(day)) {
                    structuredSchedule[day].push(time);
                }
            }
        });

        res.json(structuredSchedule);

    } catch (error) {
        console.error("Error fetching doctor's schedule:", error);
        res.status(500).json({ error: "Server error while fetching schedule." });
    }
});


module.exports = router;