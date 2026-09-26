const express = require('express');
const { register, login } = require('../controllers/authController');
const { authenticate, staffOnly } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const firstAdminOrStaff = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    if (count === 0) return next();
    return authenticate(req, res, () => staffOnly(req, res, next));
  } catch (err) {
    next(err);
  }
};

router.post('/register', firstAdminOrStaff, register);
router.post('/login', login);

module.exports = router;