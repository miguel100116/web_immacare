// backend/routes/appointment-routes.js
const express = require('express');
const Appointment = require('../models/appointment-model');
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/doctor-model');
const { createLog } = require('../logService');

// NOTE: ensureAuthenticated will be applied in server.js before this router is used.

// POST /save-data  (User creates an appointment)
router.post('/save-data', async (req, res) => {
    try {
        console.log("📨 Received appointment data:", req.body);
        const { date, time, firstName, lastName, suffix, specialization, doctor: doctorId, reason, address, age, phone, rescheduleOf } = req.body;        // --- VALIDATION STEP ---
        if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
          console.error(`❌ VALIDATION FAILED: Doctor ID is invalid. Received: ${doctorId}`);
             return res.status(400).redirect(`/appointment.html?error=${encodeURIComponent("A valid doctor must be selected.")}`);
        }
        if (!specialization || !mongoose.Types.ObjectId.isValid(specialization)) {
            console.error("❌ Invalid or missing Specialization ID received:", specialization);
            return res.status(400).redirect(`/appointment.html?error=${encodeURIComponent("Invalid specialization selected. Please try again.")}`);
        }

        // --- CHANGE START ---
        // 1. Update the populate() call to fetch the specific name fields.
        const doctor = await Doctor.findById(doctorId).populate('userAccount', 'firstName lastName suffix');
        
        if (!doctor || !doctor.userAccount) { // Added check for userAccount
            return res.status(404).redirect(`/appointment.html?error=${encodeURIComponent("Selected doctor not found.")}`);
        }

        // 2. Manually construct the doctor's full name from the populated fields.
        let doctorName = `${doctor.userAccount.firstName} ${doctor.userAccount.lastName}`;
        if (doctor.userAccount.suffix) {
            doctorName += ` ${doctor.userAccount.suffix}`;
        }
        doctorName = doctorName.trim();
        // --- CHANGE END ---
        
        // Double Booking Check
        const existingAppointment = await Appointment.findOne({ 
            doctorName, 
            date, 
            time, 
            status: { $in: ['Scheduled', 'Completed'] } 
        });
        if (existingAppointment) {
            return res.redirect(`/appointment.html?error=${encodeURIComponent(`Dr. ${doctorName} is already booked.`)}`);
        }
    
        // User Info Check
        if (!req.session.user || !req.session.user.id) {
          return res.status(401).send("User not authenticated to save appointment.");
        }

        if (rescheduleOf && mongoose.Types.ObjectId.isValid(rescheduleOf)) {
            const originalAppointment = await Appointment.findById(rescheduleOf);
            if (originalAppointment && originalAppointment.userId.toString() === req.session.user.id) {
                
                // --- THIS IS THE FIX ---
                originalAppointment.status = 'Rescheduled'; // Change "Cancelled" to "Rescheduled"
                await originalAppointment.save();
                
                const logDetails = `User '${req.session.user.fullname}' rescheduled their appointment originally on ${originalAppointment.date}. New date: ${date}.`;
                await createLog(req.session.user.id, 'APPOINTMENT_STATUS_CHANGED', logDetails);
            }
        }
        
        const patientFullName = `${firstName} ${lastName}${suffix ? ' ' + suffix : ''}`.trim();
        // Construct the data for the new appointment
        const appointmentData = {
            doctor: doctorId,
            doctorName, // This now uses our manually constructed name
            specialization: specialization, 
            date,
            time,
            patientName: patientFullName, // This uses the logged-in user's full name
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
        await appointment.save();
    
        console.log("✅ Appointment saved successfully:", appointment._id);
        res.redirect('/myappointments.html?message=Appointment%20Saved%20Successfully!');

      } catch (err) {
        console.error("❌ Mongoose validation or save error:", err);
        res.status(500).redirect(`/appointment.html?error=${encodeURIComponent("An error occurred. Could not save appointment.")}`);
      }
});

// GET /get-appointments (User views their own appointments)
router.get('/get-appointments', async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.session.user.id })
            // --- POPULATE THE FULL DOCTOR AND SPECIALIZATION OBJECTS ---
            .populate({
              path: 'doctor',
              populate: { 
                  path: 'userAccount', 
                  // --- THIS IS THE FIX ---
                  // We must select the real fields that the 'fullname' virtual depends on.
                  select: 'firstName lastName suffix' 
              }
          })
            .populate('specialization') // Get the full specialization object
            .sort({ date: -1, time: -1 });

        if (!appointments) {
            return res.json([]);
        }
        
        // No transformation needed, send the rich data directly to the frontend
        res.json(appointments);

      } catch (err) {
        console.error("❌ Error fetching appointments:", err);
        res.status(500).json({ error: "Error fetching appointments" });
      }
});

//  /cancel-appointment/:id (User cancels an appointment)
router.put("/cancel-appointment/:id", async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.session.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found." });
        }
        if (appointment.userId.toString() !== userId) {
            return res.status(403).json({ error: "You are not authorized to cancel this appointment." });
        }
        
        // --- THE KEY CHANGE: Update status instead of deleting ---
        appointment.status = 'Cancelled';
        await appointment.save();

        // --- LOG THE ACTION ---
        const logDetails = `User '${req.session.user.fullname}' cancelled their appointment for ${appointment.date} at ${appointment.time}.`;
        await createLog(userId, 'APPOINTMENT_STATUS_CHANGED', logDetails);

        res.status(200).json({ message: "Appointment cancelled successfully." });
    } catch (err) {
        console.error("Error cancelling appointment:", err)
        res.status(500).json({ error: "Error cancelling appointment." });
    }
});


module.exports = router;