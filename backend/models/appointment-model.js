// models/appointment.model.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctorName: String,
  specialization: String,
  date: String,
  time: String,
  patientName: String,
  patientEmail: String,
  address: String,
  age: Number,
  phone: String,
  reason: String,
  userId: String,
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);