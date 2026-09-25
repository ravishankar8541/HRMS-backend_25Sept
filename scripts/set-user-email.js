// Operator-only migration: use the employee's independently verified registered email.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const [username, email] = process.argv.slice(2);
if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
  console.error('Usage: node scripts/set-user-email.js USERNAME VERIFIED_EMAIL');
  process.exit(1);
}
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate({ username: username.trim().toLowerCase() },
      { $set: { email: email.trim().toLowerCase() } }, { new: true, runValidators: true });
    if (!user) throw new Error('Account not found');
    console.log('Registered email updated. Sign in again to refresh account details.');
  } finally { await mongoose.disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
