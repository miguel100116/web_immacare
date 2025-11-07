// backend/models/doctor-schedule-model.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  startTime: {
    type: String, // e.g., "09:00 AM"
    required: true,
  },
  endTime: {
    type: String, // e.g., "12:00 PM"
    required: true,
  },
  // You could add a note, e.g., "By Appointment Only"
  notes: String,
});

// A virtual to create a nicely formatted string for display
scheduleSchema.virtual('formatted').get(function() {
  let scheduleString = `🗓 ${this.dayOfWeek}, ${this.startTime} - ${this.endTime}`;
  if(this.notes) {
    scheduleString += ` | ${this.notes}`;
  }
  return scheduleString;
});

// Ensure virtuals are included in JSON output
scheduleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Schedule', scheduleSchema);