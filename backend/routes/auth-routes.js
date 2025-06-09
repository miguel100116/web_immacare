// routes/auth-routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createLog } = require('../logService');

// Note the path change: we are going up one directory (`../`) to find the `models` folder.
const Users = require('../models/user-model'); 
// Same path change for the middleware
const { ensureAuthenticated } = require('../middleware/auth-middleware');

const router = express.Router();
const port = 5300; // Needed for generating links in emails

// --- Helper: Nodemailer Transporter Setup ---
// Defining it once can be cleaner, but we'll follow the original's pattern
// of creating it where needed for this refactor.
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


// --- PRE-REGISTRATION CHECKS ---

router.post('/check-email', async (req, res) => {
    try {
        const user = await Users.findOne({ signupEmail: req.body.signupEmail });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// router.post('/check-fullname', async (req, res) => {
//     try {
//         const user = await Users.findOne({ fullname: req.body.fullname });
//         res.json({ exists: !!user });
//     } catch (error) {
//         res.status(500).json({ error: "Server error" });
//     }
// });


// --- REGISTRATION & VERIFICATION ---

router.post('/post', async (req, res) => {
    const { firstName, lastName, suffix, signupEmail, Age, Sex, PhoneNumber, Address, signupPassword, confirmPassword } = req.body;

    if (signupPassword !== confirmPassword) {
        return res.status(400).json({ error: "❌ Passwords do not match" });
    }

    if (signupPassword.length < 8 || !/[A-Z]/.test(signupPassword) ||
        !/[a-z]/.test(signupPassword) || !/[0-9]/.test(signupPassword) ||
        !/[^A-Za-z0-9]/.test(signupPassword)) {
        return res.status(400).json({ error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character" });
    }

    try {
        if (await Users.findOne({ signupEmail })) return res.status(400).json({ error: "Email already registered" });   
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) return res.status(400).json({ error: "Please enter a valid email address" });
        if (PhoneNumber && PhoneNumber.replace(/\D/g, '').length < 10) return res.status(400).json({ error: "Please enter a valid phone number (at least 10 digits)" });

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(signupPassword, saltRounds);

        const user = new Users({
            firstName,
            lastName,
            suffix,
            signupEmail,
            Age,
            Sex,
            PhoneNumber,
            Address,
            signupPassword: hashedPassword,
        });
        await user.save();

        console.log("✅ User registered:", user.fullname);

        const transporter = createTransporter();
        const mailOptions = {
            from: '"ImmaCare+ <deguzmanjatrish@gmail.com>',
            to: signupEmail,
            subject: "Verify your account - ImmaCare+",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Welcome to ImmaCare+</h2>
                <h3>Hello ${firstName},</h3>
                <p>Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:${port}/verify?email=${encodeURIComponent(signupEmail)}"
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                    Verify Email
                  </a>
                </div>
              </div>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Email sending error:", error);
                return res.status(500).json({ error: "Error sending verification email." });
            }
            console.log("✅ Verification email sent:", info.response);
            res.status(201).json({
                success: true,
                message: "Registration successful! Please check your email to verify your account."
            });
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/verify', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await Users.findOne({ signupEmail: email });

        if (!user) return res.status(404).send('<h2>User not found</h2>');
        if (user.isVerified) return res.send('<h2>Email already verified. You can now log in.</h2><a href="/login.html">Login</a>');

        user.isVerified = true;
        await user.save();

        res.send(`
            <div style="text-align: center; padding: 50px;">
                <h2 style="color: #4CAF50;">✅ Email Verified Successfully!</h2>
                <p>You can now log in to your ImmaCare+ account.</p>
                <a href="/login.html" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none;">Go to Login</a>
            </div>
        `);
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).send('<h2>Verification Failed</h2><p>An error occurred.</p>');
    }
});

// --- LOGIN / LOGOUT & SESSION ---

router.post('/login', async (req, res) => {
    try {
        const { signupEmail, signupPassword } = req.body;
        const user = await Users.findOne({ signupEmail });

        if (!user || !user.isVerified) {
            return res.status(401).json({ error: "Invalid credentials or account not verified." });
        }

        const isMatch = await bcrypt.compare(signupPassword, user.signupPassword);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Set the session data
        req.session.user = {
            id: user._id,
            fullname: user.fullname,
            signupEmail: user.signupEmail,
            isAdmin: user.isAdmin,
            isDoctor: user.isDoctor,
            isStaff: user.isStaff
        };
        
        // --- THE FIX: NO MORE REDIRECT ---
        // Save the session and in the callback, send the JSON response.
        req.session.save(async (err) => { 
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Could not save session." });
            }

            // --- LOG THE LOGIN ACTION ---
            await createLog(user._id, 'USER_LOGIN', `User '${user.fullname}' logged in successfully.`);
            
            // Determine the redirect URL on the server
            let redirectUrl;
            if (user.isAdmin) {
                redirectUrl = "/admin.html";
            } else if (user.isDoctor) {
                redirectUrl = "/doctor/dashboard";
            } else if (user.isStaff) {
                redirectUrl = "/staff/dashboard"; // This is the new condition
            } else {
                redirectUrl = "/main.html"; // Default for regular users
            }

            console.log(`✅ Login success for ${user.email}. Sending redirect URL: ${redirectUrl}`);
            
            // Send a success response with the URL for the client to handle
            res.status(200).json({ success: true, redirect: redirectUrl });
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


router.get('/logout', (req, res) => {
    const userName = req.session.user ? req.session.user.fullname : 'User';
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Error logging out");
        }
        res.clearCookie('connect.sid');
        console.log(`✅ ${userName} logged out.`);
        res.redirect('/login.html?message=Logged out successfully');
    });
});


// --- PASSWORD RESET ---

router.post('/request-reset', async (req, res) => {
    const { signupEmail } = req.body;
    try {
        const user = await Users.findOne({ signupEmail });
        if (!user) return res.status(400).json({ error: "Email not found" });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `http://localhost:${port}/reset-password.html?token=${token}`; // Points to the HTML page
        const transporter = createTransporter();
        const mailOptions = {
            from: `"ImmaCare+" <deguzmanjatrish@gmail.com>`,
            to: signupEmail,
            subject: "Password Reset Request",
            html: `<h3>Hello ${user.fullname},</h3><p>Click the link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) return res.status(500).json({ error: "Error sending email" });
            res.status(200).json({ message: "Password reset email sent." });
        });

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must meet complexity requirements" });
    }

    try {
        const user = await Users.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: "Token is invalid or has expired" });

        user.signupPassword = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password has been reset successfully." });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


// --- USER PROFILE & SESSION INFO ---

// Note: ensureAuthenticated middleware is used here
router.get("/check-auth", ensureAuthenticated, (req, res) => {
    res.json({
        loggedIn: true,
        user: req.session.user // The middleware already ensures this exists
    });
});

router.put("/update-profile", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { firstName, lastName, suffix, Age, Sex, PhoneNumber, Address } = req.body;

    try {
        const updatedUser = await Users.findByIdAndUpdate(userId,
            { firstName, lastName, suffix, Age, Sex, PhoneNumber, Address},
            { new: true, runValidators: true }
        ).select('-signupPassword');

        if (!updatedUser) return res.status(404).json({ error: "User not found" });

        // Update session with new details
        req.session.user.fullname = updatedUser.fullname;
        req.session.save(async err => {
            if (err) console.error("Session save error after profile update:", err);
            await createLog(userId, 'USER_PROFILE_UPDATE', `User '${updatedUser.fullname}' updated their profile.`);
            res.json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser
            });
        });

    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Update failed" });
    }
});

router.get('/getUser', async (req, res) => { // Make it async
    if (req.session.user && req.session.user.id) {
        try {
            // Fetch the full user profile from the DB to get all details
            const user = await Users.findById(req.session.user.id).select('-signupPassword');
            if (user) {
                res.json({
                    loggedIn: true,
                    fullname: user.fullname,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    suffix: user.suffix,
                    signupEmail: user.signupEmail,
                    isAdmin: user.isAdmin,
                    isDoctor: user.isDoctor,
                    isStaff: user.isStaff,
                    address: user.Address,
                    age: user.Age,
                    phoneNumber: user.PhoneNumber 
                });
            } else {
                 res.json({ loggedIn: false });
            }
        } catch(error) {
            console.error("Error fetching user details in /getUser:", error);
            res.json({ loggedIn: false });
        }
    } else {
        res.json({ loggedIn: false });
    }
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.session.user.id;

        // 1. Validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ error: 'New passwords do not match.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
        }
        // Add full complexity check for consistency
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({ error: "Password must contain uppercase, lowercase, number, and special character." });
        }

        // 2. Find the user
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 3. Verify their current password
        const isMatch = await bcrypt.compare(currentPassword, user.signupPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password.' });
        }
        
        // 4. Hash and save the new password
        const saltRounds = 10;
        user.signupPassword = await bcrypt.hash(newPassword, saltRounds);
        await user.save();
        
        // Log this action
        await createLog(userId, 'USER_PROFILE_UPDATE', `User '${user.fullname}' changed their password.`);
        
        console.log(`✅ Password changed successfully for user: ${user.signupEmail}`);
        res.status(200).json({ message: 'Password updated successfully!' });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Server error while changing password.' });
    }
});

// Finally, export the router
module.exports = router;