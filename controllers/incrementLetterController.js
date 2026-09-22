const IncrementLetter = require('../models/IncrementLetter');
const sendIncrementLetter = require('../utils/incrementEmailService');

exports.createIncrement = async (req, res) => {
  try {
    const {
      employeeName,
      fathersName,
      address,
      phoneNumber,
      emailId,
      employeeId,
      department,
      position,
      currentSalary,
      newSalary,
      incrementPercentage,
      effectiveDate,
      hrName,
      performanceRemarks,
      reasonForIncrement
    } = req.body;

    if (!employeeName || !emailId || !position || !currentSalary || !newSalary || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeName, emailId, position, currentSalary, newSalary, effectiveDate'
      });
    }

    const calculatedPercentage = incrementPercentage || 
      (((Number(newSalary) - Number(currentSalary)) / Number(currentSalary)) * 100).toFixed(2);

    const incrementId = `INC/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const record = await IncrementLetter.create({
      incrementId,
      employeeName: employeeName.trim(),
      fathersName: fathersName ? fathersName.trim() : 'N/A',
      address: address ? address.trim() : 'N/A',
      phoneNumber: phoneNumber ? phoneNumber.trim() : 'N/A',
      emailId: emailId.trim().toLowerCase(),
      employeeId: employeeId || 'N/A',
      department: department || 'Technology',
      position: position.trim(),
      currentSalary: Number(currentSalary),
      newSalary: Number(newSalary),
      incrementPercentage: Number(calculatedPercentage),
      effectiveDate: new Date(effectiveDate),
      hrName: hrName ? hrName.trim() : 'HR Manager',
      performanceRemarks: performanceRemarks || '',
      reasonForIncrement: reasonForIncrement || 'Performance appraisal'
    });

    return res.status(201).json({
      success: true,
      message: 'Increment letter generated successfully',
      incrementId,
      data: record
    });
  } catch (error) {
    console.error('Create Increment Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const record = await IncrementLetter.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Increment letter record not found' });
    }

    const recipient = (email || record.emailId).trim();
    await sendIncrementLetter(recipient, record);

    record.emailStatus = 'Sent';
    await record.save();

    return res.json({
      success: true,
      message: `Increment letter sent successfully to ${recipient}`
    });
  } catch (error) {
    console.error('Send Increment Email Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};