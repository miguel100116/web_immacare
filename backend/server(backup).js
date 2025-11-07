// server.js
require('dotenv').config()
const crypto = require('crypto')
const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const nodemailer = require("nodemailer");
const app = express();
const port = 5300;

// Middleware
// ... (your existing middleware is fine) ...
app.use(cors({
  origin: 'http://localhost:5300',
  credentials: true
}));
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'immacareSecretKey123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(express.static(path.join(__dirname)))


// MongoDB connection
// ... (your existing connection is fine) ...
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));


// --- START: Auth Middleware Definitions ---
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    if (req.accepts('html')) {
        return res.status(401).redirect('/login.html?message=Please login to continue');
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    if (req.accepts('html')) {
        return res.status(403).send('<h2>403 Forbidden</h2><p>You do not have permission to access this resource.</p><a href="/main.html">Go to Main Page</a>');
    }
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
}
// --- END: Auth Middleware Definitions ---

const inventoryItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true, unique: true }, // Assuming item names are unique
    quantity: { type: Number, required: true, default: 0, min: 0 },
    // Status will be derived, but you can store it if you want to override auto-calculation
    // status: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'Out of Stock'},
    // You might want other fields like: unit, costPrice, sellingPrice, supplier, category, lastReorderedDate
    description: String,
    reorderLevel: { type: Number, default: 10 } // Example default reorder level
}, { timestamps: true });

// Virtual for status (calculated based on quantity and reorderLevel)
inventoryItemSchema.virtual('status').get(function() {
    if (this.quantity <= 0) {
        return 'Out of Stock';
    } else if (this.quantity <= this.reorderLevel) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
});

// Ensure virtuals are included when converting to JSON
inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema, "inventory");

// User Schema & Model
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: false },
    signupEmail: { type: String, unique: true, required: true },
    Age: String,
    Sex: String,
    PhoneNumber: String,
    signupPassword: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: { type: Boolean, default: false }
});
const Users = mongoose.model("Users", userSchema);


// Appointment Schema & Model
// ... (your existing appointmentSchema is fine) ...
const appointmentSchema = new mongoose.Schema({
  doctorName: String,
  specialization: String,
  date: String,
  time: String,
  patientName: String,
  patientEmail: String,
  address: String,
  age: Number,
  phone: String,
  reason: String,
  userId: String,
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });
const Appointment = mongoose.model("Appointment", appointmentSchema);


// --- START: ensureFirstAdmin Function ---
async function ensureFirstAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@immacare.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'AdminP@ssw0rd2024!';

        let adminUser = await Users.findOne({ signupEmail: adminEmail });

        if (!adminUser) {
            console.log(`Admin user ${adminEmail} not found. Creating...`);
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
            adminUser = new Users({
                fullname: 'ImmaCare Administrator',
                signupEmail: adminEmail,
                Age: 'N/A',
                Sex: 'N/A',
                PhoneNumber: '000-000-0000',
                signupPassword: hashedPassword,
                isVerified: true,
                isAdmin: true
            });
            await adminUser.save();
            console.log(`✅ Admin user '${adminEmail}' created successfully.`);
        } else {
            let updated = false;
            if (!adminUser.isAdmin) {
                adminUser.isAdmin = true;
                updated = true;
            }
            if (!adminUser.isVerified) {
                adminUser.isVerified = true;
                updated = true;
            }
            if (updated) {
                await adminUser.save();
                console.log(`ℹ️ Admin user '${adminEmail}' updated (isAdmin/isVerified).`);
            } else {
                 console.log(`ℹ️ Admin user '${adminEmail}' already exists and is admin.`);
            }
        }
    } catch (error) {
        console.error('❌ Error ensuring first admin:', error);
    }
}
ensureFirstAdmin(); // Call it!
// --- END: ensureFirstAdmin Function ---


// Serve HTML pages (apply ensureAuthenticated where needed)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/main.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'main.html'))); // PROTECTED
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, 'confirmation.html'))); // Assuming public or handle auth

// Check routes
// ... (your /check-email and /check-fullname routes are fine) ...
app.post('/check-email', async (req, res) => {
    try {
        const user = await Users.findOne({ signupEmail: req.body.signupEmail });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});
app.post('/check-fullname', async (req, res) => {
    try {
        const user = await Users.findOne({ fullname: req.body.fullname });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/inventory', ensureAdmin, async (req, res) => {
    try {
        const { itemName, quantity, description, reorderLevel /*, other fields */ } = req.body;

        if (!itemName || quantity === undefined) { // quantity can be 0
            return res.status(400).json({ error: 'Item name and quantity are required.' });
        }
        if (await InventoryItem.findOne({ itemName })) {
             return res.status(400).json({ error: `Inventory item "${itemName}" already exists.` });
        }

        const newItem = new InventoryItem({
            itemName,
            quantity,
            description,
            reorderLevel: reorderLevel !== undefined ? reorderLevel : 10 // Use provided or default
            // ... other fields
        });
        await newItem.save();
        console.log('✅ New inventory item created by admin:', newItem._id);
        res.status(201).json(newItem);
    } catch (err) {
        console.error('Error creating new inventory item by admin:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error creating inventory item.' });
    }
});
// Registration Route
// ... (your /post registration route is fine) ...
app.post('/post', async (req, res) => {
    const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

    if (signupPassword !== confirmPassword) {
        return res.status(400).json({ error: "❌ Passwords do not match" });
    }

    if (signupPassword.length < 8 || !/[A-Z]/.test(signupPassword) ||
        !/[a-z]/.test(signupPassword) || !/[0-9]/.test(signupPassword) ||
        !/[^A-Za-z0-9]/.test(signupPassword)) {
        return res.status(400).json({ error: "Password must meet complexity requirements" });
    }


    try {
        const emailExists = await Users.findOne({ signupEmail });
        if (emailExists) return res.status(400).json({ error: "Email already registered" });

        const nameExists = await Users.findOne({ fullname });
        if (nameExists) return res.status(400).json({ error: "Full name already registered" });

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }

        if (fullname.split(/\s+/).length < 2) {
            return res.status(400).json({ error: "Please enter your full name (first and last name)" });
        }

        if (PhoneNumber && PhoneNumber.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: "Please enter a valid phone number (at least 10 digits)" });
        }

     const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(signupPassword, saltRounds);

const user = new Users({
    fullname,
    signupEmail,
    Age,
    Sex,
    PhoneNumber,
    signupPassword: hashedPassword,
    confirmPassword: hashedPassword // Note: Storing confirmPassword hash is usually not necessary
});
await user.save();

        // Do not set session on registration, make them verify and login
        // req.session.user = { fullname, signupEmail };
        console.log("✅ User registered:", user.fullname); // Changed user to user.fullname

        // === Email Sending Setup with Brevo ===
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false, // Use TLS
            auth: {
                user: process.env.BREVO_SMTP_USER || "8e2a3f001@smtp-brevo.com", // Use .env
                pass: process.env.BREVO_SMTP_PASS || "8hDCQ6NnwAV5JBHs"      // Use .env
            }
        });

        const mailOptions = {
            from: '"ImmaCare+ <deguzmanjatrish@gmail.com>',
            to: signupEmail,
            subject: "Verify your account - ImmaCare+",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Welcome to ImmaCare+</h2>
                <h3>Hello ${fullname},</h3>
                <p>Thank you for registering at ImmaCare+. Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:${port}/verify?email=${encodeURIComponent(signupEmail)}"
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                  </a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="http://localhost:${port}/verify?email=${encodeURIComponent(signupEmail)}">http://localhost:${port}/verify?email=${encodeURIComponent(signupEmail)}</a></p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <hr style="margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from ImmaCare+</p>
              </div>
            `
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


// Email Verification Route
// ... (your /verify route is fine) ...
app.get('/verify', async (req, res) => {
    const { email } = req.query;

    try {
        const user = await Users.findOne({ signupEmail: email });

        if (!user) {
            return res.send(`
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #f44336;">❌ User not found</h2>
                    <p>The verification link is invalid or the user doesn't exist.</p>
                    <a href="http://localhost:${port}/" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Sign Up</a>
                </div>
            `);
        }

        if (user.isVerified) {
            return res.send(`
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #ff9800;">⚠️ Already Verified</h2>
                    <p>Your email has already been verified.</p>
                    <a href="http://localhost:${port}/login.html" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
                </div>
            `);
        }

        user.isVerified = true;
        await user.save();

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #4CAF50;">✅ Email Verified Successfully!</h2>
                <p>Your email has been successfully verified. You can now log in to your ImmaCare+ account.</p>
                <a href="http://localhost:${port}/login.html" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
            </div>
        `);
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ Verification Failed</h2>
                <p>An error occurred during verification. Please try again or contact support.</p>
                <a href="http://localhost:${port}/" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Sign Up</a>
            </div>
        `);
    }
});


// --- START: PRIMARY LOGIN ROUTE (MODIFIED) ---
app.post('/login', async (req, res) => {
    const { signupEmail, signupPassword } = req.body;

    try {
        const user = await Users.findOne({ signupEmail });

        if (!user) {
            return res.status(400).json({ error: "Account not found." });
        }

        if (!user.isVerified) {
            return res.status(400).json({ error: "Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(signupPassword, user.signupPassword);
        if (!isMatch) {
            return res.status(400).json({ error: "Incorrect password." });
        }

        req.session.user = {
            id: user._id,
            fullname: user.fullname,
            signupEmail: user.signupEmail,
            isAdmin: user.isAdmin // isAdmin added to session
        };

        req.session.save(err => {
            if (err) {
                console.error("❌ Session save error during login:", err);
                return res.status(500).json({ error: "Internal Server Error (session save)" });
            }
            console.log("✅ Login successful:", user.fullname, "Is Admin:", user.isAdmin);

            // Conditional redirect logic
            if (user.isAdmin) {
                res.status(200).json({ redirect: "/admin.html" });
            } else {
                res.status(200).json({ redirect: "/main.html" });
            }
        });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// --- END: PRIMARY LOGIN ROUTE ---


// Password Reset Routes
// ... (your /forgotpassword, /request-reset, /reset-password routes are fine) ...
// Consider using process.env for Brevo credentials here too.
// Make sure reset URLs use `localhost:${port}`
app.post('/forgotpassword', async (req, res) => {
  const { signupEmail } = req.body;
  const transporter = nodemailer.createTransport({ // Define transporter if not globally available
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
          user: process.env.BREVO_SMTP_USER || "8e2a3f001@smtp-brevo.com",
          pass: process.env.BREVO_SMTP_PASS || "8hDCQ6NnwAV5JBHs"
      }
  });
  try {
    const user = await Users.findOne({ signupEmail });
    if (!user) {
      return res.status(400).json({ error: "No account with that email found." });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expiration = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expiration;
    await user.save();

    const resetUrl = `http://localhost:${port}/reset-password?token=${token}`;

    const mailOptions = {
      from: '"ImmaCare+ Support" <deguzmanjatrish@gmail.com>',
      to: signupEmail,
      subject: "Password Reset Request - ImmaCare+",
      html: `
        <p>Hello ${user.fullname},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Email sending error:", error);
        return res.status(500).json({ error: "Failed to send reset email." });
      }
      console.log("Password reset email sent:", info.response);
      res.json({ success: true, message: "Password reset email sent." });
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/request-reset', async (req, res) => {
  const { signupEmail } = req.body;
  const transporter = nodemailer.createTransport({ // Define transporter
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
          user: process.env.BREVO_SMTP_USER || "8e2a3f001@smtp-brevo.com",
          pass: process.env.BREVO_SMTP_PASS || "8hDCQ6NnwAV5JBHs"
      }
  });
  try {
    const user = await Users.findOne({ signupEmail });
    if (!user) return res.status(400).json({ error: "Email not found" });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `http://localhost:${port}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"ImmaCare+" <deguzmanjatrish@gmail.com>`,
      to: signupEmail,
      subject: "Password Reset Request",
      html: `
        <h3>Hello ${user.fullname},</h3>
        <p>You requested a password reset. Click the link below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Password reset email error:", error);
        return res.status(500).json({ error: "Error sending password reset email" });
      }
      console.log("✅ Password reset email sent:", info.response);
      res.status(200).json({ message: "Password reset email sent. Please check your inbox." });
    });

  } catch (error) {
    console.error("Request reset error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post('/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ error: "Password must meet complexity requirements" });
  }

  try {
    const user = await Users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.signupPassword = hashedPassword;
    // user.confirmPassword = hashedPassword; // No need to store confirmPassword in DB

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Appointment Routes (apply ensureAuthenticated)
app.post('/save-data', ensureAuthenticated, async (req, res) => { // PROTECTED
  try {
    console.log("📨 Received appointment data:", req.body);
    const { doctorName, date, time, patientName, specialization, reason, address, age, phone } = req.body; // Destructure for clarity

    // === START: Double Booking Check ===
    const existingAppointment = await Appointment.findOne({
      doctorName: doctorName,
      date: date,
      time: time,
      status: { $ne: 'Cancelled' } // Only consider Scheduled or Completed appointments as booked
    });

    if (existingAppointment) {
      // For regular users, we might not want to send a JSON error if the form submission isn't AJAX.
      // Sending a redirect with an error message is common.
      // Or, if your appointment.html form uses AJAX, send JSON.
      // For now, let's assume a redirect for this route.
      console.warn(`WARN: Double booking attempt by ${req.session.user.signupEmail} for Dr. ${doctorName} at ${date} ${time}`);
      return res.redirect(`/appointment.html?error=${encodeURIComponent(`Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.`)}`);
      // If using AJAX on client-side for this form:
      // return res.status(409).json({ error: `Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.` });
    }
    // === END: Double Booking Check ===

    let patientEmailForDb = '';
    let userIdForDb = '';

    if (req.session.user && req.session.user.signupEmail) {
      patientEmailForDb = req.session.user.signupEmail;
      userIdForDb = req.session.user.id;
    } else {
      // This case should ideally not happen if ensureAuthenticated works
      return res.status(401).send("User not authenticated to save appointment.");
    }

    const appointmentData = {
        doctorName,
        specialization,
        date,
        time,
        patientName: patientName || req.session.user.fullname, // Use provided or session fullname
        patientEmail: patientEmailForDb,
        address,
        age,
        phone,
        reason,
        userId: userIdForDb,
        status: 'Scheduled' // Default status
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    console.log("✅ Appointment saved:", appointment);
    res.redirect('/myappointments.html?message=Appointment%20Saved%20Successfully!'); // Redirect to myappointments
  } catch (err) {
    console.error("❌ Error saving appointment:", err);
    // Send a generic error message or redirect to an error page
    res.status(500).redirect(`/appointment.html?error=${encodeURIComponent("Failed to save appointment. Please try again.")}`);
    // If using AJAX: res.status(500).json({ error: "Failed to save appointment. Please try again." });
  }
});

app.get('/api/admin/appointments', ensureAdmin, async (req, res) => {
  try {
    const showArchived = req.query.archived === 'true'; // Check for query parameter

    let query = {};
    if (showArchived) {
      query.isArchived = true;
      console.log('SERVER: GET /api/admin/appointments - Fetching ARCHIVED appointments.');
    } else {
      // Fetch where isArchived is false OR isArchived does not exist (for older data)
      query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
      console.log('SERVER: GET /api/admin/appointments - Fetching NON-ARCHIVED (active) appointments.');
    }

    const allAppointments = await Appointment.find(query)
      .sort({
        status: 1, // Sort by status first
        date: 1,   // Then by date
        time: 1    // Then by time
      });
    console.log(`SERVER: Found ${allAppointments.length} appointments matching query.`);
    res.json(allAppointments);
  } catch (err) {
    console.error("SERVER ERROR in GET /api/admin/appointments:", err);
    res.status(500).json({ error: 'Server error fetching appointments' });
  }
});

app.post('/api/admin/appointments', ensureAdmin, async (req, res) => {
    try {
        const {
            patientName, patientEmail, doctorName, specialization, date, time,
            reason, address, age, phone, status // status can be set by admin
        } = req.body;

        // Add more validation as needed
        if (!patientName || !doctorName || !date || !time || !status) {
            return res.status(400).json({ error: 'Missing required fields for new appointment.' });
        }

        // === START: Double Booking Check ===
        const existingAppointment = await Appointment.findOne({
          doctorName: doctorName,
          date: date,
          time: time,
          status: { $ne: 'Cancelled' } // Only consider Scheduled or Completed appointments
        });

        if (existingAppointment) {
          console.warn(`ADMIN WARN: Double booking attempt for Dr. ${doctorName} at ${date} ${time}`);
          return res.status(409).json({ error: `Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.` }); // 409 Conflict
        }
        // === END: Double Booking Check ===

        const newAppointment = new Appointment({
            patientName, patientEmail, doctorName, specialization, date, time,
            reason, address, age, phone, status
            // userId can be tricky for admin-created appointments unless admin selects a user.
            // For now, it might be null or linked to the admin if necessary.
        });
        await newAppointment.save();
        console.log('✅ New appointment created by admin:', newAppointment._id);
        res.status(201).json(newAppointment);
    } catch (err) {
        console.error('Error creating new appointment by admin:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error creating appointment.' });
    }
});

app.get('/get-appointments', ensureAuthenticated, async (req, res) => { // PROTECTED
  try {
    // No need to check req.session.user again, ensureAuthenticated does it.
    const email = req.session.user.signupEmail;
    // Or better, use userId if you store it with appointments:
    // const userId = req.session.user.id;
    // const appointments = await Appointment.find({ userId: userId });
    const appointments = await Appointment.find({ patientEmail: email });
    res.json(appointments);
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.status(500).send("Error fetching appointments");
  }
});

app.delete("/cancel-appointment/:id", ensureAuthenticated, async (req, res) => { // PROTECTED
  try {
    // Add check to ensure user can only cancel their own appointments (unless admin)
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).send("Appointment not found.");
    if (appointment.userId !== req.session.user.id && !req.session.user.isAdmin) {
        return res.status(403).send("You are not authorized to cancel this appointment.");
    }
    await Appointment.findByIdAndDelete(req.params.id);
    res.status(200).send("Appointment cancelled.");
  } catch (err) {
    res.status(500).send("Error cancelling appointment.");
  }
});


// --- START: REMOVE THIS DUPLICATE LOGIN BLOCK ---
/*
//login collapse // THIS ENTIRE BLOCK SHOULD BE DELETED
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin
  };

  res.json({ success: true, user: req.session.user });
});
*/
// --- END: REMOVE THIS DUPLICATE LOGIN BLOCK ---


// Other Auth Routes (Review and ensure consistency, apply ensureAuthenticated)
app.get("/check-auth", ensureAuthenticated, (req, res) => { // PROTECTED
  // This route now just confirms session exists due to ensureAuthenticated
  res.json({
      loggedIn: true,
      user: { // Send consistent user object
          id: req.session.user.id,
          fullname: req.session.user.fullname,
          signupEmail: req.session.user.signupEmail,
          isAdmin: req.session.user.isAdmin
      }
  });
});

app.put("/update-profile", ensureAuthenticated, async (req, res) => { // PROTECTED
  const userId = req.session.user.id;
  const { fullname, Age, Sex, PhoneNumber } = req.body; // Allow updating relevant fields

  // Add validation for inputs here

  try {
      const updatedUser = await Users.findByIdAndUpdate(userId,
          { fullname, Age, Sex, PhoneNumber }, // Fields to update
          { new: true, runValidators: true }
      ).select('-signupPassword'); // Exclude password

      if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
      }

      // Update session with new details
      req.session.user.fullname = updatedUser.fullname;
      // Potentially update other session fields if they were changed and are stored

      req.session.save(err => {
          if (err) {
              console.error("Session save error after profile update:", err);
              // Fallthrough to send success, but log error
          }
          res.json({ success: true, message: "Profile updated successfully", user: {
              fullname: updatedUser.fullname,
              signupEmail: updatedUser.signupEmail,
              Age: updatedUser.Age,
              Sex: updatedUser.Sex,
              PhoneNumber: updatedUser.PhoneNumber,
              isAdmin: updatedUser.isAdmin
          }});
      });

  } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Update failed" });
  }
});


// Get Current User (already modified correctly)
app.get('/getUser', (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            fullname: req.session.user.fullname,
            signupEmail: req.session.user.signupEmail,
            isAdmin: req.session.user.isAdmin // This is correct
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
app.get('/logout', (req, res) => {
    const userName = req.session.user ? req.session.user.fullname : 'User';
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Error logging out");
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        console.log(`✅ ${userName} logged out.`);
        res.redirect('/login.html?message=Logged out successfully'); // Redirect to login after logout
    });
});


// Admin Routes (already protected correctly with ensureAdmin)
app.get('/admin.html', ensureAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/api/admin/users', ensureAdmin, async (req, res) => {
  try {
    const allUsers = await Users.find({}, '-signupPassword');
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/admin/appointments', ensureAdmin, async (req, res) => {
  try {
    // Fetch non-archived appointments, sort by status (custom order), then by date
    const allAppointments = await Appointment.find({ isArchived: false })
      .sort({
        status: 1, // This will sort alphabetically: Cancelled, Completed, Scheduled
        date: 1,   // Then by date
        time: 1    // Then by time
      });
    res.json(allAppointments);
  } catch (err) {
    console.error("Error fetching appointments for admin:", err);
    res.status(500).json({ error: 'Server error fetching appointments' });
  }
});
// Admin API: list all inventory items
app.get('/api/admin/inventory', ensureAdmin, async (req, res) => {
  try {
    console.log('SERVER: GET /api/admin/inventory - Request received.');
    const allItems = await InventoryItem.find({}); // Fetch all items for now

    // Sort in JavaScript to achieve the custom status order
    // because virtual fields can't be directly sorted in MongoDB find queries easily.
    const customSortOrder = { 'Out of Stock': 1, 'Low Stock': 2, 'In Stock': 3 };
    allItems.sort((a, b) => {
        const statusOrderA = customSortOrder[a.status] || 4; // a.status is the virtual
        const statusOrderB = customSortOrder[b.status] || 4; // b.status is the virtual
        if (statusOrderA !== statusOrderB) {
            return statusOrderA - statusOrderB;
        }
        return a.itemName.localeCompare(b.itemName); // Secondary sort by name
    });

    console.log(`SERVER: Found ${allItems.length} inventory items.`);
    res.json(allItems);
  } catch (err) {
    console.error("SERVER ERROR in GET /api/admin/inventory:", err);
    res.status(500).json({ error: 'Server error fetching inventory items' });
  }
});
app.delete('/api/admin/inventory/:id', ensureAdmin, async (req, res) => {
    try {
        const itemId = req.params.id;
        const deletedItem = await InventoryItem.findByIdAndDelete(itemId);

        if (!deletedItem) {
            return res.status(404).json({ error: 'Inventory item not found.' });
        }
        console.log(`✅ Inventory item ${itemId} deleted successfully.`);
        res.json({ message: 'Inventory item deleted successfully.', deletedItem });
    } catch (err) {
        console.error(`Error deleting inventory item ${req.params.id}:`, err);
        res.status(500).json({ error: 'Server error deleting inventory item.' });
    }
});


app.put('/api/admin/appointments/:id/status', ensureAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;

        if (!status || !['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value provided.' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { status: status },
            { new: true, runValidators: true } // Return the updated document, run schema validators
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }
        console.log(`✅ Appointment ${appointmentId} status updated to ${status}`);
        res.json(appointment);
    } catch (err) {
        console.error(`Error updating appointment ${req.params.id} status:`, err);
        res.status(500).json({ error: 'Server error updating appointment status.' });
    }
});

app.put('/api/admin/appointments/:id/archive', ensureAdmin, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        appointment.isArchived = !appointment.isArchived; // Toggle the archive status
        await appointment.save();

        console.log(`✅ Appointment ${appointmentId} archived status set to ${appointment.isArchived}`);
        res.json({ message: `Appointment ${appointment.isArchived ? 'archived' : 'unarchived'} successfully.`, appointment });
    } catch (err) {
        console.error(`Error archiving/unarchiving appointment ${req.params.id}:`, err);
        res.status(500).json({ error: 'Server error toggling appointment archive status.' });
    }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});