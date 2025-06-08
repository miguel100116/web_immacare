// backend/routes/auth-mobile-routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Users = require('../models/user-model');
const router = express.Router();

// POST /api/auth/mobile-register
router.post('/mobile-register', async (req, res) => {
    const { name, email, password, age, mobile, address, gender } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    try {
        if (await Users.findOne({ signupEmail: email })) {
            return res.status(409).json({ message: "Email already registered." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const nameParts = name.trim().split(' ');
        const user = new Users({
            firstName: nameParts.shift(),
            lastName: nameParts.join(' '),
            signupEmail: email, Age: age, Sex: gender,
            PhoneNumber: mobile, Address: address,
            signupPassword: hashedPassword, isVerified: true,
        });
        await user.save();
        res.status(201).json({ message: "Registration successful! You can now log in." });
    } catch (error) {
        console.error("Mobile registration error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/auth/mobile-login
router.post('/mobile-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ signupEmail: email });
        if (!user || !(await bcrypt.compare(password, user.signupPassword))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const payload = { userId: user._id, name: user.fullname, email: user.signupEmail };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'immacareSecretKey123', { expiresIn: '30d' });
        res.status(200).json({
            message: 'Login successful',
            token: token,
            userData: { id: user._id, name: user.fullname, email: user.signupEmail }
        });
    } catch (error) {
        console.error("Mobile login error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;