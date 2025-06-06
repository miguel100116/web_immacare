// routes/appointment.routes.js
const express = require('express');
const Appointment = require('../models/appointment-model');
const router = express.Router();

// NOTE: ensureAuthenticated will be applied in server.js before this router is used.

// POST /save-data  (User creates an appointment)
router.post('/save-data', async (req, res) => {
    try {
        console.log("📨 Received appointment data:", req.body);
        const { doctorName, date, time, patientName, specialization, reason, address, age, phone } = req.body; // Destructure for clarity
    
        // === START: Double Booking Check ===
        const existingAppointment = await Appointment.findOne({
          doctorName: doctorName,
          date: date,
          time: time,
          status: { $ne: 'Cancelled' } // Only consider Scheduled or Completed appointments as booked
        });
    
        if (existingAppointment) {
          // For regular users, we might not want to send a JSON error if the form submission isn't AJAX.
          // Sending a redirect with an error message is common.
          // Or, if your appointment.html form uses AJAX, send JSON.
          // For now, let's assume a redirect for this route.
          console.warn(`WARN: Double booking attempt by ${req.session.user.signupEmail} for Dr. ${doctorName} at ${date} ${time}`);
          return res.redirect(`/appointment.html?error=${encodeURIComponent(`Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.`)}`);
          // If using AJAX on client-side for this form:
          // return res.status(409).json({ error: `Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.` });
        }
        // === END: Double Booking Check ===
    
        let patientEmailForDb = '';
        let userIdForDb = '';
    
        if (req.session.user && req.session.user.signupEmail) {
          patientEmailForDb = req.session.user.signupEmail;
          userIdForDb = req.session.user.id;
        } else {
          // This case should ideally not happen if ensureAuthenticated works
          return res.status(401).send("User not authenticated to save appointment.");
        }
    
        const appointmentData = {
            doctorName,
            specialization,
            date,
            time,
            patientName: patientName || req.session.user.fullname, // Use provided or session fullname
            patientEmail: patientEmailForDb,
            address,
            age,
            phone,
            reason,
            userId: userIdForDb,
            status: 'Scheduled' // Default status
        };
    
        const appointment = new Appointment(appointmentData);
        await appointment.save();
    
        console.log("✅ Appointment saved:", appointment);
        res.redirect('/myappointments.html?message=Appointment%20Saved%20Successfully!'); // Redirect to myappointments
      } catch (err) {
        console.error("❌ Error saving appointment:", err);
        // Send a generic error message or redirect to an error page
        res.status(500).redirect(`/appointment.html?error=${encodeURIComponent("Failed to save appointment. Please try again.")}`);
        // If using AJAX: res.status(500).json({ error: "Failed to save appointment. Please try again." });
      }
});

// GET /get-appointments (User views their own appointments)
router.get('/get-appointments', async (req, res) => {
    try {
        // No need to check req.session.user again, ensureAuthenticated does it.
        const email = req.session.user.signupEmail;
        // Or better, use userId if you store it with appointments:
        // const userId = req.session.user.id;
        // const appointments = await Appointment.find({ userId: userId });
        const appointments = await Appointment.find({ patientEmail: email });
        res.json(appointments);
      } catch (err) {
        console.error("❌ Error fetching appointments:", err);
        res.status(500).send("Error fetching appointments");
      }
});

// DELETE /cancel-appointment/:id (User cancels an appointment)
router.delete("/cancel-appointment/:id", async (req, res) => {
    try {
        // Add check to ensure user can only cancel their own appointments (unless admin)
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).send("Appointment not found.");
        if (appointment.userId !== req.session.user.id && !req.session.user.isAdmin) {
            return res.status(403).send("You are not authorized to cancel this appointment.");
        }
        await Appointment.findByIdAndDelete(req.params.id);
        res.status(200).send("Appointment cancelled.");
      } catch (err) {
        res.status(500).send("Error cancelling appointment.");
      }
});

module.exports = router;