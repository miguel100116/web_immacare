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
const port = 5300;

const app = express();

// Middleware
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'immacareSecretKey123', // Use a strong, secure key in production
    resave: false,
    saveUninitialized: true
}));

// MongoDB Atlas connection
mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority');
const db = mongoose.connection;
db.once('open', () => {
    console.log("✅ MongoDB Atlas connected successfully.");
});

// MongoDB Schema
const userSchema = new mongoose.Schema({
    fullname: String,
    signupEmail: String,
    Age: String,
    Sex: String,
    PhoneNumber: String,
    signupPassword: String,
    confirmPassword: String
});
const Users = mongoose.model("data", userSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.post('/post', async (req, res) => {
    const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

    if (signupPassword !== confirmPassword) {
        return res.send("❌ Passwords do not match");
    }

    const user = new Users({
        fullname,
        signupEmail,
        Age,
        Sex,
        PhoneNumber,
        signupPassword,
        confirmPassword
    });

    await user.save();

    // Save session
    req.session.user = {
        fullname,
        signupEmail
    };

    console.log("✅ User registered:", user);
    res.redirect('/login.html');
});

app.post('/login', async (req, res) => {
    const { signupEmail, signupPassword } = req.body;

    try {
        const user = await Users.findOne({ signupEmail });

        if (!user) {
            return res.send("❌ No account found with that email.");
        }

        if (user.signupPassword !== signupPassword) {
            return res.send("❌ Incorrect password.");
        }

        // Save session
        req.session.user = {
            fullname: user.fullname,
            signupEmail: user.signupEmail
        };

        console.log("✅ Login successful:", user.fullname);
        res.redirect('/main.html');
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("❌ Internal Server Error");
    }
});

// Route to get session user info
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


// //cors

// Add this CORS middleware early, before routes
app.use(cors({
  origin: 'http://localhost:5300/main.html', // replace with your actual frontend URL (including port if any)
  credentials: true
}));

// Other middleware like parsing JSON, sessions, etc.
app.use(express.json());

// Your session setup here (if you have it)
app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // secure: true if using HTTPS
}));



// Your routes
app.get('/getUser', (req, res) => {
  // example session check
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// <<<<<<< HEAD
// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const bcrypt = require('bcrypt'); // For password hashing
// const saltRounds = 10; // Define how many rounds to use for hashing
// const port = 5300;

// const app = express();
// app.use(express.static(__dirname));
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json()); // Handle JSON request bodies

// // Connect to MongoDB
// mongoose.connect('mongodb://127.0.0.1:27017/accounts', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.once('open', () => {
//     console.log("MONGODB CONNECT SUCCESSFUL");
// });
// db.on('error', (error) => {
//     console.error("Database connection error:", error);
// });

// // User Schema with validation
// const userSchema = new mongoose.Schema({
//     fullname: { type: String, required: true },
//     signupEmail: { type: String, required: true, unique: true },
//     Age: { type: String, required: true },
//     Sex: { type: String, required: true },
//     PhoneNumber: { type: String, required: true },
//     signupPassword: { type: String, required: true },
//     confirmPassword: { type: String, required: true }
// });

// const Users = mongoose.model("data", userSchema);

// // Serve signup page
// app.get('/', (req, res) => {
//     console.log("✅ GET / called");
//     res.sendFile(path.join(__dirname, 'signup.html'));
// });

// // Login route
// app.post('/login', async (req, res) => {
//     const { signupEmail, signupPassword } = req.body;

//     try {
//         const user = await Users.findOne({ signupEmail });

//         if (!user) {
//             return res.send("❌ No account found with that email.");
//         }

//         // Compare hashed password
//         const isMatch = await bcrypt.compare(signupPassword, user.signupPassword);
//         if (!isMatch) {
//             return res.send("❌ Incorrect password.");
//         }

//         console.log("✅ Login successful:", user.fullname);
//         res.redirect('/main.html'); // Ensure this file exists
//     } catch (error) {
//         console.error("Login error:", error);
//         res.status(500).send("❌ Internal Server Error");
//     }
// });

// // Signup route
// =======

// Optional: Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Error logging out");
        res.redirect('/');
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server started on http://localhost:${port}`);
});


// //legitttttttttttttttttttt
// const express = require('express');
// const mongoose = require('mongoose');
// const session = require('express-session');
// const cors = require('cors');
// const path = require('path');
// const port = 5300;

// const app = express();

// // ✅ Middleware
// app.use(cors({
//     origin: 'http://localhost:5300', // frontend origin (NO filename here!)
//     credentials: true
// }));

// app.use(express.static(__dirname));
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(session({
//     secret: 'immacareSecretKey123',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false } // true if using HTTPS
// }));

// // ✅ MongoDB Atlas connection
// mongoose.connect('mongodb+srv://bernejojoshua:immacare@immacare.xr6wcn1.mongodb.net/accounts?retryWrites=true&w=majority');
// const db = mongoose.connection;
// db.once('open', () => {
//     console.log("✅ MongoDB Atlas connected successfully.");
// });

// // ✅ MongoDB Schema
// const userSchema = new mongoose.Schema({
//     fullname: String,
//     signupEmail: String,
//     Age: String,
//     Sex: String,
//     PhoneNumber: String,
//     signupPassword: String,
//     confirmPassword: String
// });
// const Users = mongoose.model("data", userSchema);

// // ✅ Serve HTML files
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'signup.html'));
// });
// app.get('/main.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'main.html'));
// });
// app.get('/doctor.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'doctor.html'));
// });
// app.get('/profile.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'profile.html'));
// });
// app.get('/login.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'login.html'));
// });

// // ✅ Registration
// >>>>>>> 777e94572712abb483056994d29627a7514c1700
// app.post('/post', async (req, res) => {
//     const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

//     if (signupPassword !== confirmPassword) {
// <<<<<<< HEAD
//         return res.send("❌ Passwords do not match.");
//     }

//     // Hash the password before saving
//     const hashedPassword = await bcrypt.hash(signupPassword, saltRounds);

// =======
//         return res.send("❌ Passwords do not match");
//     }

// >>>>>>> 777e94572712abb483056994d29627a7514c1700
//     const user = new Users({
//         fullname,
//         signupEmail,
//         Age,
//         Sex,
//         PhoneNumber,
// <<<<<<< HEAD
//         signupPassword: hashedPassword,
//         confirmPassword: hashedPassword, // You don't need to store confirmPassword
//     });

//     try {
//         await user.save();
//         console.log("User saved:", user);
//         res.redirect('/login.html');
//     } catch (error) {
//         console.error("Signup error:", error);
// =======
//         signupPassword,
//         confirmPassword
//     });

//     await user.save();

//     req.session.user = {
//         fullname,
//         signupEmail
//     };

//     console.log("✅ User registered:", user);
//     res.redirect('/main.html');
// });

// // ✅ Login
// app.post('/login', async (req, res) => {
//     const { signupEmail, signupPassword } = req.body;

//     try {
//         const user = await Users.findOne({ signupEmail });

//         if (!user) return res.send("❌ No account found with that email.");
//         if (user.signupPassword !== signupPassword) return res.send("❌ Incorrect password.");

//         req.session.user = {
//             fullname: user.fullname,
//             signupEmail: user.signupEmail
//         };

//         console.log("✅ Login successful:", user.fullname);
//         res.redirect('/main.html');
//     } catch (error) {
//         console.error("Login error:", error);
// >>>>>>> 777e94572712abb483056994d29627a7514c1700
//         res.status(500).send("❌ Internal Server Error");
//     }
// });

// <<<<<<< HEAD
// app.listen(port, () => {
//     console.log("Server Started on port", port);
// });
// =======
// // ✅ Session checker for navbar JS
// app.get('/getUser', (req, res) => {
//     if (req.session && req.session.user) {
//         res.json({
//             loggedIn: true,
//             fullname: req.session.user.fullname,
//             signupEmail: req.session.user.signupEmail
//         });
//     } else {
//         res.json({ loggedIn: false });
//     }
// });

// // ✅ Logout
// app.get('/logout', (req, res) => {
//     req.session.destroy(err => {
//         if (err) return res.send("Error logging out");
//         res.redirect('/');
//     });
// });

// // ✅ Start server
// app.listen(port, () => {
//     console.log(`🚀 Server started at: http://localhost:${port}`);
// });

const appointmentSchema = new mongoose.Schema({
  doctorName: String,
  specialization: String,
  date: String,
  time: String,
  patientName: String,
  patientEmail: String,
});

const Appointment = mongoose.model("appointments", appointmentSchema);

// Save appointment
app.post('/appointment', async (req, res) => {
  const appointment = new Appointment(req.body);
  await appointment.save();
  res.send("✅ Appointment scheduled!");
});

// Fetch all appointments
app.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find({});
    res.json(appointments);
  } catch (error) {
    res.status(500).send("Error fetching appointments");
  }
});
// >>>>>>> 777e94572712abb483056994d29627a7514c1700
