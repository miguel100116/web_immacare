// backend/models/specialization-model.js
const mongoose = require('mongoose');

const specializationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  // You could add an icon/image path here later
  // imageUrl: String 
}, { timestamps: true });

module.exports = mongoose.model('Specialization', specializationSchema);