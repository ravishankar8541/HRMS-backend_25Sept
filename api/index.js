require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const dbConnection = require('../config/db');

// Route Imports
const employeeRoute = require('../routes/employee');
const auth = require('../routes/auth');
const offerLetterRoutes = require('../routes/offerLetter');
const appointmentLetter = require('../routes/appointmentLetter');
const incrementRoutes = require('../routes/incrementLetter');
const terminationLetter = require('../routes/terminationLetter');
const onboardingRoutes = require('../routes/onboarding');
const salaryRoutes = require('../routes/salarySlip');
const fnfRoutes = require('../routes/fnf');
const documentRoutes = require('../routes/documentRoutes');

const PORT = process.env.PORT || 5000;

// Connect Database
dbConnection();

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes Integration
app.use('/api/employee', employeeRoute);
app.use('/api/auth', auth);
app.use('/api/offer-letters', offerLetterRoutes);
app.use('/api/appointment-letters', appointmentLetter);
app.use('/api/increment-letters', incrementRoutes);
app.use('/api/termination-letters', terminationLetter);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/salarySlip', salaryRoutes);
app.use('/api/fnf', fnfRoutes);
app.use('/api/documents', documentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'active', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on PORT ${PORT}`);
});