// backend/routes/auth-mobile-routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Adjust the path to go up one level to find the 'models' directory
const Users = require('../models/user-model'); 


const router = express.Router();

const verifyToken = (req, res, next) => {
    // Get the token from the Authorization header, which is usually "Bearer <TOKEN>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // No token was sent, so the user is not authorized
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    // Verify the token is valid and not expired
    jwt.verify(token, process.env.JWT_SECRET || 'immacareSecretKey123', (err, user) => {
        if (err) {
            // Token is invalid or expired
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        // If the token is valid, attach the decoded user payload to the request object
        req.user = user; 
        // Call next() to pass control to the next function in the chain (the route handler)
        next();
    });
};

/**
 * @route   POST /api/auth/mobile-register
 * @desc    Handle user registration from the mobile app.
 * @access  Public
 */
router.post('/mobile-register', async (req, res) => {
    // 1. Get the data from the mobile app's request body
    const { name, email, password, age, mobile, address, gender } = req.body;

    // --- START OF THE FIX ---
    // These validations are now consistent with the web version
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (mobile && mobile.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ message: "Please enter a valid phone number (at least 10 digits)" });
    }
    // You could add password complexity checks here too if desired
    // --- END OF THE FIX ---

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

        // --- THE KEY CHANGE IS HERE ---
        // We create the user with the exact same field names as auth-routes.js
        const user = new Users({
            firstName,      // from 'name'
            lastName,       // from 'name'
            signupEmail: email,
            Age: age,
            Sex: gender,    // 'Sex' matches the web registration field
            PhoneNumber: mobile, // 'PhoneNumber' matches the web registration field
            Address: address,
            signupPassword: hashedPassword,
            isVerified: true // Mobile users are auto-verified
        });
        
        await user.save();

        console.log("✅ Mobile user registered with consistent data:", user.fullname);
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
    // This route is already fine and does not need changes.
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

        const payload = {
            userId: user._id,
            name: user.fullname,
            email: user.signupEmail,
            isAdmin: user.isAdmin,
            isDoctor: user.isDoctor,
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'immacareSecretKey123',
            { expiresIn: '30d' }
        );

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


router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.user.userId; // Get user ID from the verified token

        // 1. Validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'All password fields are required.' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New passwords do not match.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
        }

        // 2. Find the user
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 3. Verify their current password
        const isMatch = await bcrypt.compare(currentPassword, user.signupPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }
        
        // 4. Hash and save the new password
        user.signupPassword = await bcrypt.hash(newPassword, 10);
        await user.save();
        
        console.log(`✅ Password changed successfully for mobile user: ${user.signupEmail}`);
        res.status(200).json({ message: 'Password updated successfully!' });

    } catch (error) {
        console.error('Error changing password for mobile user:', error);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
});

module.exports = router;