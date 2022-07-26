// Initialize dotenv
require('dotenv').config()

// Import packages
const express = require('express')
const morgan = require('morgan')
const http = require('http')
const passport = require('passport')
const session = require('express-session')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()
const bcrypt = require('bcryptjs')
const methodOverride = require('method-override')
const User = require('./models/user')
const passportConfig = require("./passport/setup")
const checkAuthenticated = require('./passport/checkAuthenticated')
const checkNotAuthenticated = require('./passport/checkNotAuthenticated')

const url = process.env.DATABASE_URL

// Configure database
console.log("Connecting to mongodb...")
mongoose
  .connect(url)
  .then(() => {
    console.log('MongoDB Connected Successfully')
  })  
  .catch((error) => {
  console.log('Error connecting to MongoDB:', error.message)
})

// App setup 
app.use(morgan('tiny'))
app.use(cors())
app.use(express.json())

//Passport setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// API controllers
app.get('/', (req, res) => {
  res.status(200).send(`<h1>My First Server!</h1>`).end()
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.status(200).send(`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>My Website</title>
    </head>
    <body>
      <h1>Login</h1>
      <form>
        <input type="text" name="email" id="email" placeholder="Enter your email">
        <input type="password" name="password" id="password" placeholder="Enter your password">
        <button type="button" onclick="login()">login</button>
      </form>

      <script>
        function login(){
          let email = document.getElementById('email').value;
          let password = document.getElementById('password').value;
          let data = { email, password };
          fetch("/login", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            },
            body: JSON.stringify(data),
          })
          .then((res) =>  {
            if(res.status === 200){
              window.location.href = "/dashboard"
            } else { 
              alert('Wrong credentials') 
            }
          })
        }
      </script>
    </body>
  </html>
  `).end()
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
  res.status(200).send(`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>My Website</title>
    </head>
    <body>
      <h1>This is my dashboard</h1>
      <form action="/logout?_method=DELETE" method="POST">
        <button type="submit">logout</button>
      </form>
    </body>
  </html>  
  `)
})

app.delete('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { 
      return next(err); 
    }
    res.redirect('/login');
  });
})

app.post('/register', (req, res) => {
  let name = req.body.name
  let email = req.body.email
  let password = req.body.password

  User.findOne({ email: email }).then(user => {
    if(user){
      return res.status(400).json({
        success: false,
        message: "There is a User registered with this email already"
      })
    }

    const newUser = new User({
      name,
      email,
      password,
    })

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newUser.password, salt, (err, hash) => {
        if (err) throw err
        newUser.password = hash
        newUser.save().then(() => {
          res.status(200).json({
            success: true,
            message: "Successfully registered User"
          })
        }).catch(() => {
          res.status(400).json({
            success: false,
            message: "Failed to register User"
          })
        })
      })
    })
  })
})

app.post('/login', passportConfig.authenticate('local', { failureMessage: false }), function(req, res) {
  res.redirect('/dashboard')
})

// Server Setup
const server = http.createServer(app)
server.listen(process.env.HOST, () => {
  console.log(`Server running on port ${process.env.HOST}`)
})