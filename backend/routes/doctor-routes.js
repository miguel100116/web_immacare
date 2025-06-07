// backend/routes/doctor-routes.js
const express = require('express');
const Doctor = require('../models/doctor-model');
const Specialization = require('../models/specialization-model'); // Make sure this import exists
const router = express.Router();
const Appointment = require('../models/appointment-model');
/**
 * @route   GET /api/specializations
 * @desc    Get a list of all specializations (except "Not Specified")
 * @access  Public
 */
// THE FIX: Remove the '/api' prefix from here. The path is now relative to what's in server.js
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await Specialization.find({ name: { $ne: 'Not Specified' } })
      .sort('name');
    res.json(specializations);
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ error: 'Failed to retrieve specializations.' });
  }
});

/**
 * @route   GET /api/doctors
 * @desc    Get doctors. Can be filtered by specialization ID.
 * @access  Public
 */
// THE FIX: Remove the '/api' prefix from here as well.
router.get('/doctors', async (req, res) => {
  try {
    const { specializationId } = req.query;

    let query = { isActive: true };
    if (specializationId) {
      query.specialization = specializationId;
    }

    const doctors = await Doctor.find(query)
      .populate({
        path: 'userAccount',
        select: 'fullname signupEmail'
      })
      .populate({
        path: 'specialization',
        select: 'name'
      })
      .sort('userAccount.fullname');

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching public list of doctors:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor list.' });
  }
});

router.get('/booked-times', async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    // Validate the input
    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date are required.' });
    }

    // Find all appointments for this doctor on this date that are not cancelled
    const appointments = await Appointment.find({
      doctor: doctorId,
      date: date,
      status: { $ne: 'Cancelled' }
    });

    // Extract just the time strings from the found appointments
    const bookedTimes = appointments.map(app => app.time);

    res.json(bookedTimes); // Send back an array like ["09:00 AM", "11:30 AM"]

  } catch (error) {
    console.error('Error fetching booked times:', error);
    res.status(500).json({ error: 'Could not fetch booked times.' });
  }
});

module.exports = router;