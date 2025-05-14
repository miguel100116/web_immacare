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

