const express = require('express');
const {register, login } = require('../controllers/authController');

const router = express.Router();

const { authenticate, staffOnly } = require('../middleware/auth');
router.post('/register', authenticate, staffOnly, register);
router.post('/login', login);

module.exports = router;