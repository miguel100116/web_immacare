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
const port = 5300;

const app = express();
const port = 5300;

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
    saveUninitialized: true
}));

// === MongoDB Atlas Connection ===
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority');
const db = mongoose.connection;
db.once('open', () => {
    console.log("✅ MongoDB Atlas connected successfully.");
});

// === User Schema ===
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: false },  // optional: remove unique if you want
    signupEmail: { type: String, required: true, unique: true },
    Age: String,
    Sex: String,
    PhoneNumber: String,
    signupPassword: String,
    isVerified: { type: Boolean, default: false },

     resetPasswordToken: String,
  resetPasswordExpires: Date
});
const Appointment = mongoose.model("Appointment", appointmentSchema);

const Users = mongoose.model("data", userSchema);

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

// === Serve signup page ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// === Registration Route ===
// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, 'confirmation.html')));


// Register new user
app.post('/post', async (req, res) => {
  try {
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

// === Login Route ===
app.post('/login', async (req, res) => {
  try {
    const { signupEmail, signupPassword } = req.body;
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
            fullname: user.fullname,
            signupEmail: user.signupEmail
        };

        console.log("✅ Login successful:", user.fullname);
        res.status(200).json({ redirect: '/main.html' });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const crypto = require('crypto');

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



// === Start Server ===
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});
