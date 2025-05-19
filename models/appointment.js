const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctor: String,
  specialization: String,
  hmo: String,
  date: Date,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
});

const Appointment = mongoose.model("appointments", appointmentSchema);
module.exports = Appointment;
