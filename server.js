
// server.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

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

// MongoDB connection with error handling
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority')
  .then(() => console.log("✅ MongoDB Atlas connected successfully."))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// User Schema & Model
const userSchema = new mongoose.Schema({
  fullname: String,
  signupEmail: { type: String, unique: true },
  Age: String,
  Sex: String,
  PhoneNumber: String,
  signupPassword: String
});
const Users = mongoose.model("Users", userSchema);

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
app.post('/post', async (req, res) => {
  try {
    const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

    if (signupPassword !== confirmPassword) {
      return res.status(400).send("❌ Passwords do not match");
    }

    const existingUser = await Users.findOne({ signupEmail });
    if (existingUser) {
      return res.status(400).send("❌ Email already registered");
    }

    const newUser = new Users({ fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword });
    await newUser.save();

    req.session.user = { fullname, signupEmail };
    console.log("✅ User registered:", newUser);
    res.redirect('/login.html');
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { signupEmail, signupPassword } = req.body;
    const user = await Users.findOne({ signupEmail });

    if (!user) return res.status(400).send("❌ No account found with that email.");
    if (user.signupPassword !== signupPassword) return res.status(400).send("❌ Incorrect password.");

    req.session.user = { fullname: user.fullname, signupEmail: user.signupEmail };
    console.log("✅ Login successful:", user.fullname);
    res.redirect('/main.html');
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).send("Internal Server Error");
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

    // ❌ REMOVE THIS BLOCK BELOW (It’s for user registration, not appointment)
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



// Start server
app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});
