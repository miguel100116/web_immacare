const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const port = 5300



const app = express();
app.use(express.static(__dirname))
app.use(express.urlencoded({extended:true}))



mongoose.connect('mongodb://127.0.0.1:27017/accounts')
const db = mongoose.connection
db.once('open', () => {
    console.log("MONGODB CONNECT SUCCESSFUL")
})


const userSchema = new mongoose.Schema({
    fullname: String,
    signupEmail: String,
    Age: String,
    Sex: String,
    PhoneNumber: String, 
    signupPassword: String,
    confirmPassword: String
})

const Users = mongoose.model("data",userSchema)

app.get('/', (req, res) => {
    console.log("✅ GET / called");
    res.sendFile(path.join(__dirname, 'signup.html'));
});


// app.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, 'login.html'));

// });
// login route
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

        console.log("✅ Login successful:", user.fullname);
        // Redirect to a welcome page or dashboard
        //redirect yung totoo instead send
        res.redirect('/main.html'); // Make sure this file exists
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("❌ Internal Server Error");
    }
});



app.post('/post',async(req,res)=>{
    const{fullname,signupEmail,Age,Sex,PhoneNumber,signupPassword,confirmPassword} = req.body
    if (signupPassword !== confirmPassword) {
        return res.send("Passwords do not match");
    }
    const user = new Users({
        fullname,
        signupEmail,
        Age,
        Sex,
        PhoneNumber,
        signupPassword,
        confirmPassword,
    })
    
    await user.save()
    console.log(user)

    res.redirect('/login.html'); 

})



app.listen(port,()=>{
    console.log("Server Started")
})

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
// app.post('/post', async (req, res) => {
//     const { fullname, signupEmail, Age, Sex, PhoneNumber, signupPassword, confirmPassword } = req.body;

//     if (signupPassword !== confirmPassword) {
//         return res.send("❌ Passwords do not match.");
//     }

//     // Hash the password before saving
//     const hashedPassword = await bcrypt.hash(signupPassword, saltRounds);

//     const user = new Users({
//         fullname,
//         signupEmail,
//         Age,
//         Sex,
//         PhoneNumber,
//         signupPassword: hashedPassword,
//         confirmPassword: hashedPassword, // You don't need to store confirmPassword
//     });

//     try {
//         await user.save();
//         console.log("User saved:", user);
//         res.redirect('/login.html');
//     } catch (error) {
//         console.error("Signup error:", error);
//         res.status(500).send("❌ Internal Server Error");
//     }
// });

// app.listen(port, () => {
//     console.log("Server Started on port", port);
// });
