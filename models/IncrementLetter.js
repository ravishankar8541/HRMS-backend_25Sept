const mongoose = require('mongoose');

const incrementLetterSchema = new mongoose.Schema({
  incrementId: { type: String, required: true, unique: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
  employeeName: { type: String, required: true, trim: true },
  fathersName: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  emailId: { type: String, required: true, lowercase: true, trim: true },
  employeeId: { type: String, default: 'N/A' },
  department: { type: String, default: 'N/A' },
  position: { type: String, required: true },
  currentSalary: { type: Number, required: true },
  newSalary: { type: Number, required: true },
  incrementPercentage: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  hrName: { type: String, required: true },
  performanceRemarks: { type: String, default: '' },
  reasonForIncrement: { type: String, default: 'Based on performance and contribution' },
  emailStatus: { type: String, enum: ['Sent', 'Pending', 'Failed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('IncrementLetter', incrementLetterSchema);