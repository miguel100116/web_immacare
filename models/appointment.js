// appointment.js
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
  userId: String
});

module.exports = mongoose.model('Appointment', appointmentSchema);
