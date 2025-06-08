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
const { ensureApiAuthenticated } = require('./middleware/api-auth-middleware');

// --- 2. CORE MIDDLEWARE ---
app.use(cors()); // Use open CORS for development
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'immacareSecretKey123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));
// The express.static line was REMOVED from here.

// --- 3. DATABASE CONNECTION ---
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ===================================================================
// --- 4. API ROUTE WIRING (MUST BE FIRST) ---
// ===================================================================
app.use('/api/auth', authMobileRoutes); 
app.use('/api', doctorRoutes);
app.use('/api/user', ensureApiAuthenticated, userMobileRoutes);
app.use('/', authRoutes); // Website auth
app.use('/', ensureAuthenticated, appointmentRoutes); // Protected website routes
app.use('/api/admin', ensureAdmin, adminRoutes);
app.use('/api/doctor', ensureDoctor, doctorApiRoutes);
app.use('/api/staff', ensureStaff, staffRoutes);

// ===================================================================
// --- 5. STATIC FILE & PAGE SERVING (MUST BE AFTER API ROUTES) ---
// ===================================================================

// THIS IS THE CORRECT LOCATION FOR THE STATIC MIDDLEWARE
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// These routes serve the specific HTML pages for your website
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

// --- 7. START SERVER ---
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});