// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const port = 5300;

// --- 1. IMPORT MODELS, MIDDLEWARE, and ROUTES ---
const Users = require('./models/user-model');
const Specialization = require('./models/specialization-model');
const authRoutes = require('./routes/auth-routes');
const appointmentRoutes = require('./routes/appointment-routes');
const adminRoutes = require('./routes/admin-routes');
const doctorRoutes = require('./routes/doctor-routes');
const { ensureAuthenticated, ensureAdmin, ensureDoctor, ensureStaff } = require('./middleware/auth-middleware');
const doctorApiRoutes = require('./routes/doctor-api-routes');
const staffRoutes = require('./routes/staff-routes');
const authMobileRoutes = require('./routes/auth-mobile-routes');
const userMobileRoutes = require('./routes/user-mobile-routes');

// --- 2. CORE MIDDLEWARE ---
app.use(cors({
  origin: 'http://localhost:5300',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'immacareSecretKey123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));
app.use(express.static(path.join(__dirname, '..', 'frontend')));



// --- 3. DATABASE CONNECTION ---
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));


// --- 4. STARTUP SCRIPTS ---
// ** PUT THIS SECTION BACK IN **
// async function ensureFirstAdmin() {
//     // Your existing function to create the first admin user
//     // This is important for initial setup
//     const adminExists = await Users.findOne({ isAdmin: true });
//     if (!adminExists) {
//         console.log("No admin found, creating one...");
//         const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS || 'AdminPassword1!', 10);
//         await Users.create({
//             fullname: 'Admin User',
//             signupEmail: process.env.ADMIN_EMAIL || 'admin@immacare.com',
//             signupPassword: hashedPassword,
//             isAdmin: true,
//             isVerified: true
//         });
//         console.log("✅ Default admin created.");
//     }
// }

// async function ensureSpecializations() {
//   try {
//     const specializations = [
//       { name: 'Obstetrics and Gynecology' }, { name: 'Pediatrics' },
//       { name: 'Internal Medicine' }, { name: 'Surgery' },
//       { name: 'Dermatology' }, { name: 'Ophthalmology' },
//       { name: 'Urology' }, { name: 'ENT' },
//       { name: 'Not Specified' }
//     ];

//     for (const spec of specializations) {
//       await Specialization.findOneAndUpdate(
//         { name: spec.name },
//         { $setOnInsert: spec },
//         { upsert: true, new: true, setDefaultsOnInsert: true }
//       );
//     }
//     console.log('✅ Specializations seeded successfully.');
//   } catch (error) {
//     console.error('❌ Error seeding specializations:', error);
//   }
// }

// Call the startup scripts
// ensureFirstAdmin();
// ensureSpecializations();
// ** END OF SECTION TO PUT BACK **


// --- 5. STATIC PAGE SERVING ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'index.html')));
app.get('/signup.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'authScreens', 'signup.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'authScreens', 'login.html')));
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'confirmation.html')));
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'index.html')));
app.get('/doctors.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'doctors.html')));
app.get('/admin.html', ensureAdmin, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'adminScreen', 'admin.html')));
app.get('/appointment.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'appointment.html')));
app.get('/myappointments.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'myappointments.html')));
app.get('/learnmore/:serviceName', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'learnmore.html'));
});
app.get('/profile.html', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'profile.html'));
});
app.get('/doctor/dashboard', ensureDoctor, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'doctorScreen', 'doctorDashboard.html'));
});
app.get('/staff/dashboard', ensureStaff, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'staffScreen', 'staff.html'));
});

app.use('/api', doctorRoutes); // e.g., /api/specializations
// --- 6. API ROUTE WIRING ---
app.use('/', authRoutes); // Handles web login/logout
app.use('/', ensureAuthenticated, appointmentRoutes); // Handles web appointments



// =================== ADD THIS NEW SECTION ===================
// Group 3: Mobile App API Routes
app.use('/api/auth', authMobileRoutes); // Mounts /api/auth/mobile-login, etc.
// TODO: Protect these routes with a JWT middleware later
// app.use('/api/user', ensureApiAuthenticated, userMobileRoutes); // Mounts /api/user/profile, etc.
// ===========================================================

// Group 4: Role-Protected API Routes (Admins, Doctors, Staff)
app.use('/api/admin', ensureAdmin, adminRoutes);
app.use('/api/doctor', ensureDoctor, doctorApiRoutes);
app.use('/api/staff', ensureStaff, staffRoutes);

// --- 7. START SERVER ---
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});