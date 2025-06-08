// models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    suffix: { type: String, trim: true, default: '' },
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
    isAdmin: { type: Boolean, default: false },
    isDoctor: { type: Boolean, default: false },
    isStaff: { type: Boolean, default: false },
});

userSchema.virtual('fullname').get(function() {
    let fullname = `${this.firstName} ${this.lastName}`;
    if (this.suffix) {
        fullname += ` ${this.suffix}`;
    }
    return fullname.trim();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Users", userSchema);