const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Please sign in' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ message: 'Session expired. Please sign in again.' }); }
  try {
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    if (!user.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.username || "")) user.email = user.username;
    req.user = user;
    next();
  } catch (error) { next(error); }
};
exports.staffOnly = (req, res, next) => {
  if (!['admin', 'hr'].includes(req.user.role)) return res.status(403).json({ message: 'HR access required' });
  next();
};
