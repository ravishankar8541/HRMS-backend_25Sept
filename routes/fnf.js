const express = require('express');
const router = express.Router();

// Import the FNF controller functions
const { createFNFRecord, updateStatus, sendEmail, deleteRecord } = require('../controllers/fnfController');

/**
 * @route   POST /api/fnf
 * @desc    Create a new FNF settlement record in the database
 * @access  Private (Admin/HR)
 */
router.post('/', createFNFRecord);
router.put('/:id', createFNFRecord);
router.delete('/:id', deleteRecord);
router.patch('/:id/status', updateStatus);
router.get('/', async (req,res) => res.json({success:true,data:await require('../models/FNF').find({deletedAt:null}).sort({createdAt:-1}).lean()}));

/**
 * @route   POST /api/fnf/:id/send
 * @desc    Generate FNF PDF and send it via email to the employee
 * @access  Private (Admin/HR)
 */
router.post('/:id/send', sendEmail);

module.exports = router;