const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ensure 'uploads' directory exists
// ─────────────────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created 'uploads' directory");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multer Configuration (Storage, Limits, and File Filtering)
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },         // Maps to adharCardDoc
  { name: 'addressProof', maxCount: 1 },    // Maps to panCardDoc
  { name: 'educationProof', maxCount: 1 },
  { name: 'experienceLetter', maxCount: 1 }
]);

// Wrapper middleware to gracefully catch Multer validation errors
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size exceeds limit of 5MB.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/onboarding/submit/:id - Submit Employee Onboarding Data & Files
// ─────────────────────────────────────────────────────────────────────────────
router.post('/submit/:id', uploadMiddleware, async (req, res) => {
  const uploadedFiles = [];

  try {
    const employeeId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or missing Employee ID' 
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Clone form body
    const body = { ...req.body };
    const updateData = {};

    // Standard employee details
    if (body.name) updateData.name = body.name.trim();
    if (body.designation) updateData.designation = body.designation.trim();
    if (body.department) updateData.department = body.department.trim();
    if (body.bankName) updateData.bankName = body.bankName.trim();

    // Map frontend aliases to Employee model fields
    if (body.joiningDate || body.dateOfJoining) {
      updateData.dateOfJoining = new Date(body.joiningDate || body.dateOfJoining);
    }
    if (body.pan || body.panNumber) {
      updateData.panNumber = (body.pan || body.panNumber).trim().toUpperCase();
    }
    if (body.adhar || body.adharNumber) {
      updateData.adharNumber = (body.adhar || body.adharNumber).trim();
    }
    if (body.bankAccount || body.accountNumber) {
      updateData.accountNumber = (body.bankAccount || body.accountNumber).trim();
    }
    if (body.ifsc || body.ifscCode) {
      updateData.ifscCode = (body.ifsc || body.ifscCode).trim().toUpperCase();
    }

    // Parse Boolean background verification
    if (body.bgVerification !== undefined) {
      updateData.bgVerification = body.bgVerification === 'true' || body.bgVerification === true;
    }

    // Process and attach uploaded files
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        updateData.photo = req.files.photo[0].filename;
        uploadedFiles.push(req.files.photo[0].path);
      }
      if (req.files.idProof && req.files.idProof[0]) {
        updateData.adharCardDoc = req.files.idProof[0].filename;
        uploadedFiles.push(req.files.idProof[0].path);
      }
      if (req.files.addressProof && req.files.addressProof[0]) {
        updateData.panCardDoc = req.files.addressProof[0].filename;
        uploadedFiles.push(req.files.addressProof[0].path);
      }
      if (req.files.educationProof && req.files.educationProof[0]) {
        updateData.educationProof = req.files.educationProof[0].filename;
        uploadedFiles.push(req.files.educationProof[0].path);
      }
      if (req.files.experienceLetter && req.files.experienceLetter[0]) {
        updateData.experienceLetter = req.files.experienceLetter[0].filename;
        uploadedFiles.push(req.files.experienceLetter[0].path);
      }
    }

    // Status tracking
    updateData.onboardingStatus = 'Completed';

    // Update Employee document
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed and documents verified successfully',
      data: updatedEmployee,
      employee: updatedEmployee
    });

  } catch (error) {
    // Delete newly uploaded files from disk if database update fails
    uploadedFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    });

    console.error('Onboarding submission error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete onboarding'
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/onboarding/employees - Fetch List for Onboarding Statuses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find()
      .select('-__v')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;