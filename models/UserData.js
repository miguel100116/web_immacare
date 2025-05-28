const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  fullName: String,
  age: Number,
  gender: String,
  phone: String,
  location: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserData', userDataSchema);
