// backend/routes/appointment-routes.js
const express = require('express');
const Appointment = require('../models/appointment-model');
// We don't need to import Specialization here for this fix, but it's good practice
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/doctor-model');

// NOTE: ensureAuthenticated will be applied in server.js before this router is used.

// POST /save-data  (User creates an appointment)
router.post('/save-data', async (req, res) => {
    try {
        console.log("📨 Received appointment data:", req.body);
       const { date, time, patientName, specialization, doctor: doctorId, reason, address, age, phone } = req.body;

        // --- VALIDATION STEP ---
        if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
          console.error(`❌ VALIDATION FAILED: Doctor ID is invalid. Received: ${doctorId}`);
             return res.status(400).redirect(`/appointment.html?error=${encodeURIComponent("A valid doctor must be selected.")}`);
        }
        if (!specialization || !mongoose.Types.ObjectId.isValid(specialization)) {
            console.error("❌ Invalid or missing Specialization ID received:", specialization);
            return res.status(400).redirect(`/appointment.html?error=${encodeURIComponent("Invalid specialization selected. Please try again.")}`);
        }

        const doctor = await Doctor.findById(doctorId).populate('userAccount', 'fullname');
        if (!doctor) {
            return res.status(404).redirect(`/appointment.html?error=${encodeURIComponent("Selected doctor not found.")}`);
        }
        const doctorName = doctor.userAccount.fullname;
        
        // Double Booking Check (This logic is fine as is)
       const existingAppointment = await Appointment.findOne({ doctorName, date, time, status: { $ne: 'Cancelled' } });
        if (existingAppointment) {
            return res.redirect(`/appointment.html?error=${encodeURIComponent(`Dr. ${doctorName} is already booked.`)}`);
        }
    
        // User Info Check (This logic is fine as is)
        if (!req.session.user || !req.session.user.id) {
          return res.status(401).send("User not authenticated to save appointment.");
        }
    
        // Construct the data for the new appointment
        const appointmentData = {
            doctor: doctorId,
            doctorName,
            specialization: specialization, // This is the ObjectId from the form
            date,
            time,
            patientName: patientName || req.session.user.fullname,
            patientEmail: req.session.user.signupEmail,
            address,
            age,
            phone,
            reason,
            userId: req.session.user.id,
            status: 'Scheduled'
        };
    
        console.log("✅ Preparing to save appointment with this data:", appointmentData);

        const appointment = new Appointment(appointmentData);
        await appointment.save(); // This should now work
    
        console.log("✅ Appointment saved successfully:", appointment._id);
        res.redirect('/myappointments.html?message=Appointment%20Saved%20Successfully!');

      } catch (err) {
        // This is the block that's likely being triggered.
        console.error("❌ Mongoose validation or save error:", err);
        // The error message will tell us exactly which field is wrong.
        res.status(500).redirect(`/appointment.html?error=${encodeURIComponent("An error occurred. Could not save appointment.")}`);
      }
});

// GET /get-appointments (User views their own appointments)
router.get('/get-appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.session.user.id })
          .populate('specialization', 'name') // Only populate specialization
          .sort({ date: -1, time: -1 });

        if (!appointments) {
            return res.json([]);
        }

        // --- EXPLICIT DATA TRANSFORMATION ---
        // Create a new, clean array of objects to send.
        const responseData = appointments.map(app => ({
            _id: app._id,
            date: app.date,
            time: app.time,
            doctorName: app.doctorName, // This is saved as a string, so it's safe
            patientName: app.patientName, // This is also a string
            // Safely access the populated name
            specializationName: app.specialization ? app.specialization.name : 'Unknown Specialty',
            reason: app.reason,
            status: app.status
        }));
        
        console.log("✅ Sending this transformed data to frontend:", responseData);
        res.json(responseData);

      } catch (err) {
        console.error("❌ Error fetching appointments:", err);
        res.status(500).json({ error: "Error fetching appointments" });
      }
});

// DELETE /cancel-appointment/:id (User cancels an appointment)
router.delete("/cancel-appointment/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
          return res.status(404).json({ error: "Appointment not found." });
        }
        // Use .toString() to safely compare ObjectIds
        if (appointment.userId.toString() !== req.session.user.id) {
            return res.status(403).json({ error: "You are not authorized to cancel this appointment." });
        }
        
        await Appointment.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Appointment cancelled." });
      } catch (err) {
        console.error("Error cancelling appointment:", err)
        res.status(500).json({ error: "Error cancelling appointment." });
      }
});


module.exports = router;