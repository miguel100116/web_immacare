// // const express = require('express')
// // const mongoose = require('mongoose')
// // const path = require('path')
// // const port = 5300



// // const app = express();
// // app.use(express.static(__dirname))
// // app.use(express.urlencoded({extended:true}))



// // // mongoose.connect('mongodb://127.0.0.1:27017/accounts')
// // mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority');

// // const db = mongoose.connection
// // db.once('open', () => {
// //     console.log("MONGODB CONNECT SUCCESSFUL")
// // })


// // const userSchema = new mongoose.Schema({
// //     fullname: String,
// //     signupEmail: String,
// //     Age: String,
// //     Sex: String,
// //     PhoneNumber: String, 
// //     signupPassword: String,
// //     confirmPassword: String
// // })

// // const Users = mongoose.model("data",userSchema)

// // app.get('/', (req, res) => {
// //     console.log("✅ GET / called");
// //     res.sendFile(path.join(__dirname, 'signup.html'));
// // });


// // // app.get('/login', (req, res) => {
// // //     res.sendFile(path.join(__dirname, 'login.html'));

// // // });
// // // login route
// // app.post('/login', async (req, res) => {
// //     const { signupEmail, signupPassword } = req.body;

// //     try {
// //         const user = await Users.findOne({ signupEmail });

// //         if (!user) {
// //             return res.send("❌ No account found with that email.");
// //         }

// //         if (user.signupPassword !== signupPassword) {
// //             return res.send("❌ Incorrect password.");
            
// //         }

// //         console.log("✅ Login successful:", user.fullname);
// //         // Redirect to a welcome page or dashboard
// //         //redirect yung totoo instead send
// //         res.redirect('/main.html'); // Make sure this file exists
// //     } catch (error) {
// //         console.error("Login error:", error);
// //         res.status(500).send("❌ Internal Server Error");
// //     }
// // });



// // app.post('/post',async(req,res)=>{
// //     const{fullname,signupEmail,Age,Sex,PhoneNumber,signupPassword,confirmPassword} = req.body
// //     if (signupPassword !== confirmPassword) {
// //         return res.send("Passwords do not match");
// //     }
// //     const user = new Users({
// //         fullname,
// //         signupEmail,
// //         Age,
// //         Sex,
// //         PhoneNumber,
// //         signupPassword,
// //         confirmPassword,
// //     })
    
// //     await user.save()
// //     console.log(user)

// //     res.redirect('/login.html'); 

// // })



// // app.listen(port,()=>{
// //     console.log("Server Started")
// // })



const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt'); // Add this import
const UserData = require('./models/UserData');
const port = 5300;

const app = express();

// === Enable CORS before any routes ===
app.use(cors({
    origin: 'http://localhost:5300',
    credentials: true
}));

// === Middleware ===
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'immacareSecretKey123',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// === MongoDB Atlas Connection ===
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority');
const db = mongoose.connection;
db.once('open', () => {
    console.log("✅ MongoDB Atlas connected successfully.");
});

// === User Schema ===
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    signupEmail: { type: String, required: true, unique: true },
    Age: String,
    Sex: String,
    PhoneNumber: String,
    signupPassword: String,
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

// === Appointment Schema (if needed) ===
const appointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'data' },
    date: Date,
    time: String,
    service: String,
    status: { type: String, default: 'pending' }
});

const Users = mongoose.model("data", userSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);

// === Check if email exists ===
app.post('/check-email', async (req, res) => {
    try {
        const user = await Users.findOne({ signupEmail: req.body.signupEmail });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// === Check if fullname exists ===
app.post('/check-fullname', async (req, res) => {
    try {
        const user = await Users.findOne({ fullname: req.body.fullname });
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// === Serve HTML pages ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, 'confirmation.html')));

// === Registration Route ===
app.post('/post', async (req, res) => {
    try {
        const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

        // Password validation
        if (signupPassword !== confirmPassword) {
            return res.status(400).json({ error: "❌ Passwords do not match" });
        }
        
        if (signupPassword.length < 8 || !/[A-Z]/.test(signupPassword) ||
            !/[a-z]/.test(signupPassword) || !/[0-9]/.test(signupPassword) ||
            !/[^A-Za-z0-9]/.test(signupPassword)) {
            return res.status(400).json({ error: "Password must meet complexity requirements" });
        }

        // Check for existing users
        const emailExists = await Users.findOne({ signupEmail });
        if (emailExists) return res.status(400).json({ error: "Email already registered" });

        const nameExists = await Users.findOne({ fullname });
        if (nameExists) return res.status(400).json({ error: "Full name already registered" });

        // Validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }

        if (fullname.split(/\s+/).length < 2) {
            return res.status(400).json({ error: "Please enter your full name (first and last name)" });
        }

        if (PhoneNumber && PhoneNumber.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: "Please enter a valid phone number (at least 10 digits)" });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(signupPassword, saltRounds);

        const user = new Users({
            fullname,
            signupEmail,
            Age,
            Sex,
            PhoneNumber,
            signupPassword: hashedPassword
        });
        
        await user.save();

        // === Email Sending Setup with Brevo ===
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            auth: {
                user: "8e2a3f001@smtp-brevo.com",
                pass: "8hDCQ6NnwAV5JBHs"
            }
        });

        const mailOptions = {
            from: '"ImmaCare+" <deguzmanjatrish@gmail.com>',
            to: signupEmail,
            subject: "Verify your account - ImmaCare+",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Welcome to ImmaCare+</h2>
                <h3>Hello ${fullname},</h3>
                <p>Thank you for registering at ImmaCare+. Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:5300/verify?email=${encodeURIComponent(signupEmail)}" 
                     style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                  </a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="http://localhost:5300/verify?email=${encodeURIComponent(signupEmail)}">http://localhost:5300/verify?email=${encodeURIComponent(signupEmail)}</a></p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <hr style="margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from ImmaCare+</p>
              </div>
            `
        };

        // Test the transporter before sending
        try {
            await transporter.verify();
            console.log("✅ SMTP connection verified");
        } catch (error) {
            console.error("❌ SMTP connection failed:", error);
            return res.status(500).json({ 
                success: false,
                error: "Email service is currently unavailable. Account created but verification email could not be sent." 
            });
        }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Email sending error:", error);
                return res.status(500).json({ 
                    success: false,
                    error: "Account created but verification email could not be sent. Please contact support." 
                });
            }
            console.log("✅ Verification email sent:", info.response);
            res.status(201).json({
                success: true,
                message: "Registration successful! Please check your email to verify your account."
            });
        });
    } catch (error) {
        console.error("Registration error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Handle specific errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                error: "Please check your input and try again." 
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false,
                error: "An account with this email already exists." 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: "Unable to create account. Please try again later." 
        });
    }
});

// === Email Verification Route ===
app.get('/verify', async (req, res) => {
    const { email } = req.query;

    try {
        const user = await Users.findOne({ signupEmail: email });

        if (!user) {
            return res.send(`
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #f44336;">❌ User not found</h2>
                    <p>The verification link is invalid or the user doesn't exist.</p>
                    <a href="http://localhost:5300/" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Sign Up</a>
                </div>
            `);
        }

        if (user.isVerified) {
            return res.send(`
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #ff9800;">⚠️ Already Verified</h2>
                    <p>Your email has already been verified.</p>
                    <a href="http://localhost:5300/login.html" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
                </div>
            `);
        }

        user.isVerified = true;
        await user.save();

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #4CAF50;">✅ Email Verified Successfully!</h2>
                <p>Your email has been successfully verified. You can now log in to your ImmaCare+ account.</p>
                <a href="http://localhost:5300/login.html" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
            </div>
        `);
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ Verification Failed</h2>
                <p>An error occurred during verification. Please try again or contact support.</p>
                <a href="http://localhost:5300/" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Sign Up</a>
            </div>
        `);
    }
});

// === Login Route ===
app.post('/login', async (req, res) => {
    try {
        const { signupEmail, signupPassword } = req.body;
        const user = await Users.findOne({ signupEmail });

        if (!user) {
            return res.status(400).json({ error: "❌ No account found with that email." });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return res.status(400).json({ error: "❌ Please verify your email before logging in." });
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(signupPassword, user.signupPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "❌ Incorrect password." });
        }

        // Save session
        req.session.user = {
            fullname: user.fullname,
            signupEmail: user.signupEmail
        };

        console.log("✅ Login successful:", user.fullname);
        res.json({ success: true, message: "Login successful!" });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "❌ Internal Server Error" });
    }
});

// === Get User Session ===
app.get('/getUser', (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            fullname: req.session.user.fullname,
            signupEmail: req.session.user.signupEmail
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// === Get User Data Route ===
app.get('/get-user-data', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                error: "Please log in to view your data." 
            });
        }

        // Find the user
        const user = await Users.findOne({ signupEmail: req.session.user.signupEmail });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found." 
            });
        }

        // Get user data
        const userData = await UserData.findOne({ userId: user._id });

        res.json({
            success: true,
            userData: userData
        });

    } catch (error) {
        console.error("Get user data error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to retrieve user data. Please try again later." 
        });
    }
});


// === Logout Route ===
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: "Error logging out" });
        res.json({ success: true, message: "Logged out successfully" });
    });
});

// === Start Server ===
app.listen(port, () => {
    console.log(`🚀 Server started at http://localhost:${port}`);
});
// === Save Appointment Route ===
app.post('/save-appointment', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                error: "Please log in to book an appointment." 
            });
        }

        const { date, time, service, notes } = req.body;

        // Validation
        if (!date || !time || !service) {
            return res.status(400).json({ 
                success: false,
                error: "Please fill in all required fields (date, time, and service)." 
            });
        }

        // Find the user
        const user = await Users.findOne({ signupEmail: req.session.user.signupEmail });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found." 
            });
        }

        // Check if appointment time is in the future
        const appointmentDateTime = new Date(`${date}T${time}`);
        if (appointmentDateTime <= new Date()) {
            return res.status(400).json({ 
                success: false,
                error: "Please select a future date and time." 
            });
        }

        // Check for conflicting appointments (optional)
        const existingAppointment = await Appointment.findOne({
            userId: user._id,
            date: new Date(date),
            time: time,
            status: { $ne: 'cancelled' }
        });

        if (existingAppointment) {
            return res.status(400).json({ 
                success: false,
                error: "You already have an appointment at this time." 
            });
        }

        // Create new appointment
        const appointment = new Appointment({
            userId: user._id,
            date: new Date(date),
            time: time,
            service: service,
            notes: notes || '',
            status: 'pending'
        });

        await appointment.save();
        
        res.json({ 
            success: true, 
            message: "Appointment booked successfully!",
            appointment: {
                id: appointment._id,
                date: appointment.date,
                time: appointment.time,
                service: appointment.service,
                status: appointment.status
            }
        });

    } catch (error) {
        console.error("Save appointment error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to book appointment. Please try again later." 
        });
    }
});




// === Update Appointment Route ===
app.put('/update-appointment/:id', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                error: "Please log in to update appointments." 
            });
        }

        const { id } = req.params;
        const { date, time, service, notes, status } = req.body;

        // Find the user
        const user = await Users.findOne({ signupEmail: req.session.user.signupEmail });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found." 
            });
        }

        // Find and update the appointment
        const appointment = await Appointment.findOneAndUpdate(
            { _id: id, userId: user._id },
            { 
                ...(date && { date: new Date(date) }),
                ...(time && { time }),
                ...(service && { service }),
                ...(notes !== undefined && { notes }),
                ...(status && { status })
            },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                error: "Appointment not found." 
            });
        }

        res.json({ 
            success: true, 
            message: "Appointment updated successfully!",
            appointment: appointment
        });

    } catch (error) {
        console.error("Update appointment error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to update appointment. Please try again later." 
        });
    }
});

// === Cancel Appointment Route ===
app.delete('/cancel-appointment/:id', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                error: "Please log in to cancel appointments." 
            });
        }

        const { id } = req.params;

        // Find the user
        const user = await Users.findOne({ signupEmail: req.session.user.signupEmail });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found." 
            });
        }

        // Find and update appointment status to cancelled
        const appointment = await Appointment.findOneAndUpdate(
            { _id: id, userId: user._id },
            { status: 'cancelled' },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                error: "Appointment not found." 
            });
        }

        res.json({ 
            success: true, 
            message: "Appointment cancelled successfully!",
            appointment: appointment
        });

    } catch (error) {
        console.error("Cancel appointment error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to cancel appointment. Please try again later." 
        });
    }
});

// === Get Available Time Slots Route ===
app.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ 
                success: false,
                error: "Please provide a date." 
            });
        }

        // Define available time slots (customize as needed)
        const allTimeSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
        ];

        // Get booked appointments for the date
        const bookedAppointments = await Appointment.find({
            date: new Date(date),
            status: { $ne: 'cancelled' }
        }).select('time');

        const bookedTimes = bookedAppointments.map(apt => apt.time);
        const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({
            success: true,
            date: date,
            availableSlots: availableSlots,
            bookedSlots: bookedTimes
        });

    } catch (error) {
        console.error("Get available slots error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to get available time slots." 
        });
    }
});

// === Get Appointments Route ===
app.get('/get-appointments', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                error: "Please log in to view your appointments." 
            });
        }

        // Find the user
        const user = await Users.findOne({ signupEmail: req.session.user.signupEmail });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found." 
            });
        }

        // Get all appointments for this user
        const appointments = await Appointment.find({ userId: user._id })
            .sort({ date: 1, time: 1 }); // Sort by date and time

        res.json({
            success: true,
            appointments: appointments,
            count: appointments.length
        });

    } catch (error) {
        console.error("Get appointments error:", error);
        res.status(500).json({ 
            success: false,
            error: "Unable to retrieve appointments. Please try again later." 
        });
    }
});
