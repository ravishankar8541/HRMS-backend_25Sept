const express = require('express');
const router = express.Router();
const { createIncrement, sendEmail } = require('../controllers/incrementLetterController');

router.post('/', createIncrement);
router.post('/:id/send', sendEmail);

module.exports = router;