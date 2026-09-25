const errorStatus = require('../utils/errorStatus');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
exports.register = async (req, res) => {
  try {
    const { name, username, password, role, email } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All Fields are required',
      });
    }

    if (role === 'admin' && req.user.role !== 'admin') return res.status(403).json({message:'Only administrators can create administrators'});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || username)) return res.status(400).json({message:'Registered email is required'});
    const existingUser = await User.findOne({ username: String(username).trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    const user = await User.create({
      name,                 // ✅ ADD THIS
      username: String(username).trim().toLowerCase(),
      email: String(email || (String(username).includes("@") ? username : "")).trim().toLowerCase(),
      password,
      role: role || 'employee',
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const user = await User.findOne({ username: String(username).trim().toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(errorStatus(error)).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};