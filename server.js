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

    // MongoDB connection with error handling
    mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
      .then(() => console.log("✅ MongoDB Atlas connected successfully."))
      .catch(err => console.error("❌ MongoDB connection error:", err));

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
      resetPasswordExpires: Date

    });
    const Users = mongoose.model("Users", userSchema);

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

    // Appointment Schema & Model
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
      userId: String
    });
    const Appointment = mongoose.model("Appointment", appointmentSchema);

    // Serve HTML pages
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
    app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
    app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
    app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, 'confirmation.html')));


    // Register new user
    // app.post('/post', async (req, res) => {
    //   try {
    //     const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

    //     if (signupPassword !== confirmPassword) {
    //       return res.status(400).send("❌ Passwords do not match");
    //     }

    //     const existingUser = await Users.findOne({ signupEmail });
    //     if (existingUser) {
    //       return res.status(400).send("❌ Email already registered");
    //     }

    //     const newUser = new Users({ fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword });
    //     await newUser.save();

    //     req.session.user = { fullname, signupEmail };
    //     console.log("✅ User registered:", newUser);
    //     res.redirect('/login.html');
    //   } catch (err) {
    //     console.error("❌ Registration error:", err);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });

    // === Registration Route ===
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
        confirmPassword: hashedPassword
    });
    await user.save();

            req.session.user = { fullname, signupEmail };
            console.log("✅ User registered:", user);

            // === Email Sending Setup with Brevo ===
            const transporter = nodemailer.createTransport({
                host: "smtp-relay.brevo.com",
                port: 587,
                secure: false, // Use TLS
                auth: {
                    user: "8e2a3f001@smtp-brevo.com", // 
                    pass: "8hDCQ6NnwAV5JBHs"
                }
            });

            const mailOptions = {
                from: '"ImmaCare+ <deguzmanjatrish@gmail.com>', // 
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



    // User login
    app.post('/login', async (req, res) => {
    const { signupEmail, signupPassword } = req.body;

    try {
        // Check if user exists
        const user = await Users.findOne({ signupEmail });

        if (!user) {
            return res.status(400).json({ error: "Account not found." });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(400).json({ error: "Please verify your email before logging in." });
        }

        // Check password
        const isMatch = await bcrypt.compare(signupPassword, user.signupPassword);
        if (!isMatch) {
            return res.status(400).json({ error: "Incorrect password." });
        }

        // Save user data to session
        req.session.user = {
            id: user._id,
            fullname: user.fullname,
            signupEmail: user.signupEmail
        };

        console.log("✅ Login successful:", user.fullname);

        // Respond with a redirect
        res.status(200).json({ redirect: "/main.html" });

    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

    // Add a field to userSchema for reset token and expiration


    // Forgot password route
    app.post('/forgotpassword', async (req, res) => {
      const { signupEmail } = req.body;

      try {
        const user = await Users.findOne({ signupEmail });
        if (!user) {
          return res.status(400).json({ error: "No account with that email found." });
        }

        // Generate token and expiration (e.g. 1 hour)
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = Date.now() + 3600000; // 1 hour from now

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expiration;
        await user.save();

        // Send email with reset link
        const resetUrl = `http://localhost:5300/reset-password?token=${token}`;

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

      try {
        const user = await Users.findOne({ signupEmail });
        if (!user) return res.status(400).json({ error: "Email not found" });

        // Generate token (random string)
        const token = crypto.randomBytes(20).toString('hex');

        // Set token and expiration (1 hour)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in ms
        await user.save();

        // Send reset email using Brevo SMTP (nodemailer)
        const transporter = nodemailer.createTransport({
          host: "smtp-relay.brevo.com",
          port: 587,
          secure: false,
          auth: {
            user: "8e2a3f001@smtp-brevo.com",
            pass: "8hDCQ6NnwAV5JBHs"
          }
        });

        const resetUrl = `http://localhost:5300/reset-password?token=${token}`;

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

      // Same password validation as signup can be done here
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
    user.signupPassword = hashedPassword; // ✅ secure
    user.confirmPassword = hashedPassword;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password has been reset successfully." });
      } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Save appointment
    // app.post('/save-data', async (req, res) => {
    //   try {
    //     // Optional: Attach logged-in user's email if session exists
    //     if (req.session.user && req.session.user.signupEmail) {
    //       req.body.patientEmail = req.session.user.signupEmail;
    //     }


    
    //     const newUser = new Users({ fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword });
    //     await newUser.save();

    //     req.session.user = { fullname, signupEmail };
    //     console.log("✅ User registered:", newUser);


    //     const appointment = new Appointment(req.body);
    //     await appointment.save();

    //     console.log("✅ Appointment saved:", appointment);
    //     res.redirect('/appointment.html');
    //   } catch (err) {
    //     console.error("❌ Error saving appointment:", err);
    //     res.status(500).send("Failed to save appointment");
    //   }
    // });
    // Save appointment
    // Save appointment
    app.post('/save-data', async (req, res) => {
      try {
        console.log("📨 Received appointment data:", req.body);

        // Add patientEmail from session if available
        if (req.session.user && req.session.user.signupEmail) {
          req.body.patientEmail = req.session.user.signupEmail;
        }

        // ❌ REMOVE THIS BLOCK BELOW (It's for user registration, not appointment)
        /*
        const newUser = new Users({ fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword });
        await newUser.save();

        req.session.user = { fullname, signupEmail };
        console.log("✅ User registered:", newUser);
        */

        // ✅ Create and save appointment
        const appointment = new Appointment(req.body);
        await appointment.save();

        console.log("✅ Appointment saved:", appointment);
        res.redirect('/appointment.html');
      } catch (err) {
        console.error("❌ Error saving appointment:", err);
        res.status(500).send("Failed to save appointment");
      }
    });

    // Get appointments for logged-in user
    app.get('/get-appointments', async (req, res) => {
      try {
        if (!req.session.user || !req.session.user.signupEmail) {
          return res.status(401).send("Not logged in");
        }

        const email = req.session.user.signupEmail;
        const appointments = await Appointment.find({ patientEmail: email });
        res.json(appointments);
      } catch (err) {
        console.error("❌ Error fetching appointments:", err);
        res.status(500).send("Error fetching appointments");
      }
    });



    //appointment actions
    // Cancel appointment
    app.delete("/cancel-appointment/:id", async (req, res) => {
      try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.status(200).send("Appointment cancelled.");
      } catch (err) {
        res.status(500).send("Error cancelling appointment.");
      }
    });


    //login collapse
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await User.findOne({ email, password });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email
        // Add more fields as needed
      };
  

      res.json({ success: true, user: req.session.user });
    });

    app.get("/check-auth", (req, res) => {
      if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
      } else {
        res.json({ loggedIn: false });
      }
    });

    app.put("/update-profile", (req, res) => {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.user._id;
      const { name } = req.body;

      User.findByIdAndUpdate(userId, { name }, { new: true })
        .then(updatedUser => {
          req.session.user.name = updatedUser.name;
          res.json({ success: true });
        })
        .catch(err => res.status(500).json({ error: "Update failed" }));
    });

    // === Get Current User ===
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

    // === Logout ===
    app.get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) return res.send("Error logging out");
            res.redirect('/');
        });
    });





    // Serve admin.html
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'admin.html'));
    });

    // Admin API: list all signup users
    app.get('/api/admin/users', async (req, res) => {
      try {
        const allUsers = await Users.find({});
        res.json(allUsers);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    });

    // Admin API: list all appointments
    app.get('/api/admin/appointments', async (req, res) => {
      try {
        const allAppointments = await Appointment.find({});
        res.json(allAppointments);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    });


    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server started at http://localhost:${port}`);
    });
