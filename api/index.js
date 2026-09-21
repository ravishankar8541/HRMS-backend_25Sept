require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors'); // Keep this import even if not used below
const dbConnection = require('../config/db'); 
const employeeRoute = require('../routes/employee');
const auth = require('../routes/auth')
const offerLetterRoutes = require('../routes/offerLetter');
const appointmentLetter = require('../routes/appointmentLetter');
const terminationLetter = require('../routes/terminationLetter');
const onboardingRoutes = require('../routes/onboarding');
const salaryRoutes = require('../routes/salarySlip');
const fnfRoutes = require('../routes/fnf');

const PORT = process.env.PORT || 5000;

dbConnection();

// MANUAL CORS HANDLER - This WILL work
app.use((req, res, next) => {
  // Allow your frontend domain
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/employee', employeeRoute);
app.use('/api/auth', auth);
app.use('/api/offer-letters', offerLetterRoutes);
app.use('/api/appointment-letters', appointmentLetter);
app.use('/api/termination-letters', terminationLetter);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/salarySlip', salaryRoutes);
app.use('/api/fnf', fnfRoutes);

app.get('/uploads/debug-test', (req, res) => {
  res.send('Static middleware is active!');
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});