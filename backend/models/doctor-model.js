// backend/models/doctor-model.js
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  // This is the crucial link back to the User model
  userAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // This MUST match the model name in user-model.js
    required: true,
    unique: true, // A user can only have one doctor profile
  },
  specialization: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId type
    ref: 'Specialization',               // Refer to the 'Specialization' model
    required: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  // Storing schedules as simple strings for now, as per the promote route
  schedules: [String], 
  acceptedHMOs: [String],
  imageUrl: {
    type: String,
    default: '/assets/images/default-avatar.png',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);