// models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: false },
    signupEmail: { type: String, unique: true, required: true },
    Age: String,
    Sex: String,
    PhoneNumber: String,
    Address: String,
    signupPassword: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: { type: Boolean, default: false }
});

// Note: You can add pre-save hooks for hashing password right here if you want
// userSchema.pre('save', async function(next) { ... });

module.exports = mongoose.model("Users", userSchema);