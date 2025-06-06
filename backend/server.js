// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // Still needed for ensureFirstAdmin
const app = express();
const port = 5300;

// --- 1. IMPORT MODELS, MIDDLEWARE, and ROUTES ---
const Users = require('./models/user-model');
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth-middleware');
const authRoutes = require('./routes/auth-routes');
const appointmentRoutes = require('./routes/appointment-routes');
const adminRoutes = require('./routes/admin-routes');


// --- 2. CORE MIDDLEWARE ---
app.use(cors({
  origin: 'http://localhost:5300',
  credentials: true
}));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'immacareSecretKey123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


// --- 3. DATABASE CONNECTION ---
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));


// --- 4. STARTUP SCRIPTS (like ensuring first admin) ---
async function ensureFirstAdmin() {
    // ... (paste your existing ensureFirstAdmin function here, it's fine)
}
ensureFirstAdmin();


// --- 5. STATIC PAGE SERVING ---
// --- Public Pages (no login required) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'index.html')));

// Auth screens
app.get('/signup.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'authScreens', 'signup.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'authScreens', 'login.html')));

// Other public screens
app.get('/confirmation.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'confirmation.html')));

// ADDING main.html and doctors.html as PUBLIC routes
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'index.html'))); // 'main.html' will also serve the main index page.
app.get('/doctors.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'doctors.html')));


// --- Protected Pages (login required) ---
// REMOVED the incorrect '/index.html' route from here.
app.get('/admin.html', ensureAdmin, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'adminScreen', 'admin.html')));
app.get('/appointment.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'appointment.html')));
app.get('/myappointments.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'screens', 'navScreens', 'myappointments.html')));

// --- 6. API ROUTE WIRING ---
// Use the routers from the /routes directory
app.use('/', authRoutes); // Handles login, register, logout, etc.
app.use('/', ensureAuthenticated, appointmentRoutes); // All user appointment routes require login
app.use('/api/admin', ensureAdmin, adminRoutes); // All admin API routes require admin access


// --- 7. START SERVER ---
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});