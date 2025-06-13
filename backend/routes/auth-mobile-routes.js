// backend/routes/auth-mobile-routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Adjust the path to go up one level to find the 'models' directory
const Users = require('../models/user-model'); 


const router = express.Router();
const port = 5300;

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

const createTransporter = () => {
    return nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false, // Use TLS
        auth: {
            user: process.env.BREVO_SMTP_USER || "8e2a3f001@smtp-brevo.com",
            pass: process.env.BREVO_SMTP_PASS || "8hDCQ6NnwAV5JBHs"
        }
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
    const BASE_URL = `https://web-immacare.onrender.com` || `http://localhost:${port}`;
    
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
        
        const nameParts = name.trim().split(' ');
        const firstName = nameParts.shift();
        const lastName = nameParts.join(' ');

        const user = new Users({
            firstName,
            lastName,
            signupEmail: email,
            Age: age,
            Sex: gender,
            PhoneNumber: mobile,
            Address: address,
            signupPassword: hashedPassword,
            isVerified: false // Correct: user is not verified yet
        });
        
        await user.save();
        console.log("✅ Mobile user created, pending verification:", user.fullname);

        const transporter = createTransporter();
        const mailOptions = {
            from: '"ImmaCare+ <deguzmanjatrish@gmail.com>',
            to: email,
            subject: "Verify your account - ImmaCare+",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Welcome to ImmaCare+</h2>
                <h3>Hello ${firstName},</h3>
                <p>Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${BASE_URL}/verify?email=${encodeURIComponent(email)}"
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                    Verify Email
                  </a>
                </div>
              </div>`
        };

        // Send the email, and handle the response inside the callback
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Mobile email sending error:", error);
                // Even if email fails, registration was successful. We can inform the user.
                return res.status(500).json({ message: "Registration successful, but we failed to send a verification email. Please contact support." });
            }

            console.log("✅ Verification email sent to mobile registrant:", info.response);
            
            // Send the success response to the mobile app ONLY after the email is sent
            res.status(201).json({
                message: "Registration successful! Please check your email to verify your account."
            });
        });

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

        if (user.isAdmin || user.isDoctor || user.isStaff) {
            return res.status(403).json({ message: "This account type cannot log in via the mobile app. Please use the web portal." });
        }
        
        if (!user.isVerified) {
            return res.status(401).json({ message: "Invalid credentials or account not verified." });
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