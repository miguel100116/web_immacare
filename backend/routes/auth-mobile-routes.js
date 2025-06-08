// backend/routes/auth-mobile-routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Adjust the path to go up one level to find the 'models' directory
const Users = require('../models/user-model'); 

const router = express.Router();

/**
 * @route   POST /api/auth/mobile-register
 * @desc    Handle user registration from the mobile app.
 * @access  Public
 */
router.post('/mobile-register', async (req, res) => {
    // In your mobile app's Registration.js, you now send 'name' which is the full name.
    // The model expects `firstName` and `lastName`. We split it here.
    const { name, email, password, age, mobile, address, gender } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    try {
        if (await Users.findOne({ signupEmail: email })) {
            return res.status(409).json({ message: "Email already registered." });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // This logic correctly handles the 'name' field from the mobile app
        const nameParts = name.trim().split(' ');
        const firstName = nameParts.shift(); // Takes the first part
        const lastName = nameParts.join(' '); // Joins the rest

        const user = new Users({
            firstName,
            lastName,
            signupEmail: email,
            Age: age,
            Sex: gender,
            PhoneNumber: mobile,
            Address: address,
            signupPassword: hashedPassword,
            isVerified: true // Mobile users can be auto-verified for simplicity
        });
        
        await user.save();

        console.log("✅ Mobile user registered:", user.fullname);
        res.status(201).json({ message: "Registration successful! You can now log in." });

    } catch (error) {
        console.error("Mobile registration error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

/**
 * @route   POST /api/auth/mobile-login
 * @desc    Handle user login from the mobile app and return a JWT.
 * @access  Public
 */
router.post('/mobile-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ signupEmail: email });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.signupPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // --- Create JWT Token ---
        const payload = {
            userId: user._id,
            name: user.fullname,
            email: user.signupEmail,
            isAdmin: user.isAdmin,
            isDoctor: user.isDoctor,
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'immacareSecretKey123', // IMPORTANT: Use a strong, secret key from your .env file!
            { expiresIn: '30d' }
        );

        // --- Respond with Token and User Data ---
        console.log(`✅ Mobile login success for ${user.signupEmail}.`);
        res.status(200).json({
            message: 'Login successful',
            token: token,
            userData: {
                id: user._id,
                name: user.fullname,
                email: user.signupEmail,
            }
        });

    } catch (error) {
        console.error("❌ Mobile login error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});


module.exports = router;