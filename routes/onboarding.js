const {serialize, metadata} = require('../utils/employeeUploads');
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
const { uploadCloud } = require('../config/cloudinary');
const upload = uploadCloud.fields([{name:'photo',maxCount:1},{name:'idProof',maxCount:1},{name:'addressProof',maxCount:1},{name:'educationProof',maxCount:1},{name:'experienceLetter',maxCount:1}]);

// Wrapper middleware to gracefully catch Multer validation errors
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File size exceeds limit of 10MB.' });
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
        updateData.photo = req.files.photo[0].path;
        uploadedFiles.push(req.files.photo[0].path);
      }
      if (req.files.idProof && req.files.idProof[0]) {
        updateData.adharCardDoc = req.files.idProof[0].path;
        uploadedFiles.push(req.files.idProof[0].path);
      }
      if (req.files.addressProof && req.files.addressProof[0]) {
        updateData.panCardDoc = req.files.addressProof[0].path;
        uploadedFiles.push(req.files.addressProof[0].path);
      }
      if (req.files.educationProof && req.files.educationProof[0]) {
        updateData.educationProof = req.files.educationProof[0].path;
        uploadedFiles.push(req.files.educationProof[0].path);
      }
      if (req.files.experienceLetter && req.files.experienceLetter[0]) {
        updateData.experienceLetter = req.files.experienceLetter[0].path;
        uploadedFiles.push(req.files.experienceLetter[0].path);
      }
    }

    const assetMap = metadata(req.files);
    if (assetMap.idProof) { assetMap.adharCardDoc=assetMap.idProof;delete assetMap.idProof; }
    if (assetMap.addressProof) { assetMap.panCardDoc=assetMap.addressProof;delete assetMap.addressProof; }
    updateData.uploadAssets={...employee.uploadAssets,...assetMap};
    // Status tracking
    updateData.onboardingStatus = 'Completed';

    if (!employee.empId) {
      updateData.empId = `VAM-${employeeId.slice(-4).toUpperCase()}`;
    }

    // Update Employee document
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    await require('../utils/documentArchive').ensure('Onboarding Report', updatedEmployee);
    return res.status(200).json({
      success: true,
      message: 'Onboarding completed and documents verified successfully',
      data: serialize(updatedEmployee),
      employee: serialize(updatedEmployee)
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
      data: employees.map(serialize)
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;