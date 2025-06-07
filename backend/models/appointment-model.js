// backend/models/appointment-model.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor', // This MUST match the name of your doctor model
    required: true
  },
  doctorName: String, 
  
  // --- THIS IS THE FIX ---
  // Change the specialization field to be a reference, just like in the Doctor model.
  specialization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Specialization'
  },
  
  date: String,
  time: String,
  patientName: String,
  patientEmail: String,
  address: String,
  age: Number,
  phone: String,
  reason: String,
  userId: { // It's good practice to make this a reference too
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);