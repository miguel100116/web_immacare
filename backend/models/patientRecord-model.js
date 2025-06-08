// backend/models/patientRecord-model.js
const mongoose = require('mongoose');

// Sub-schema for a single consultation note
const consultationSchema = new mongoose.Schema({
    consultationDate: { type: Date, default: Date.now },
    attendingDoctor: { type: String, required: true },
    complaint: { type: String, required: true },
    diagnosis: { type: String, required: true },
    treatmentPlan: { type: String },
    notes: { type: String }
}, { _id: true }); // Give each consultation a unique ID for potential future edits/deletes

const patientRecordSchema = new mongoose.Schema({
    // Crucial link to the main User account
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
        unique: true,
    },
    consultationHistory: [consultationSchema],
    
    // Other medical history fields
    allergies: [String],
    medicalConditions: [String],
    
}, { timestamps: true });

module.exports = mongoose.model('PatientRecord', patientRecordSchema);