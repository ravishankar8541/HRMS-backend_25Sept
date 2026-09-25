const errorStatus = require('../utils/errorStatus');
const Offboarding = require('../models/Offboarding');
const Employee = require('../models/Employee');

exports.createOffboarding = async (req, res) => {
  try {
    const offboarding = await Offboarding.create(req.body);
    return res.status(201).json({
      success: true,
      message: 'Offboarding record created',
      data: offboarding
    });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: err.message });
  }
};

exports.getAllOffboarding = async (req, res) => {
  try {
    const records = await Offboarding.find().populate('employee');
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: err.message });
  }
};