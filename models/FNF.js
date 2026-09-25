const mongoose = require('mongoose');

const fnfSchema = new mongoose.Schema({
  deletedAt: { type: Date, default: null },
  employeeId: { type: String, required: true, trim: true },
  employeeName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true },
  designation: { type: String, default: 'N/A' },
  dateOfJoining: { type: String, required: true },
  lastWorkingDay: { type: String, required: true },
  address: { type: String, default: 'N/A' },
  bankAccount: { type: String, default: 'N/A' },
  ifsc: { type: String, uppercase: true, default: 'N/A' },
  pendingSalary: { type: Number, default: 0 },
  leaveEncashment: { type: Number, default: 0 },
  incentive: { type: Number, default: 0 },
  gratuity: { type: Number, default: 0 },
  noticeRecovery: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  totalPayable: { type: Number, required: true },
  laptopReturned: { type: Boolean, default: false },
  idCardReturned: { type: Boolean, default: false },
  clearanceApproved: { type: Boolean, default: false },
  status: { type: String, enum: ['Draft', 'Approved', 'Disbursed', 'Settled'], default: 'Draft' },
  paymentReference: String,
  paidAt: Date,
  approvedBy: String,
  remarks: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('FNF', fnfSchema);