const express = require('express');
const router = express.Router();
const { uploadCloud: upload } = require('../config/cloudinary');

// Import controllers
const {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee
} = require('../controllers/employeeController');

// Routes
router.post("/", upload.fields([
 {name:"photo",maxCount:1},{name:"adharCardDoc",maxCount:1},{name:"panCardDoc",maxCount:1},{name:"educationProof",maxCount:1},{name:"experienceLetter",maxCount:1}
]), createEmployee); // ← If this route also has files, add upload here too

router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);

// IMPORTANT FIX: Add Multer to PUT route
router.put('/:id', 
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'adharCardDoc', maxCount: 1 },
    { name: 'panCardDoc', maxCount: 1 },
    { name: 'educationProof', maxCount: 1 },
    { name: 'experienceLetter', maxCount: 1 },
  ]), 
  updateEmployee
);

router.delete('/:id', deleteEmployee);

module.exports = router;