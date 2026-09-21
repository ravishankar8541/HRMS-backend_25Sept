const mongoose = require('mongoose');

const terminationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false // Made optional so letters can be generated on-demand
  },
  employeeName: { 
    type: String, 
    required: true,
    trim: true 
  },
  employeeEmail: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  employeePhone: { 
    type: String 
  },
  designation: {
    type: String,
    required: true
  },
  lastWorkingDate: { 
    type: Date, 
    required: true 
  },
  reason: { 
    type: String, 
    required: [true, "Reason for termination must be documented"] 
  },
  hrName: { 
    type: String, 
    required: true,
    default: "HR Manager"
  },
  emailStatus: { 
    type: String, 
    enum: ['Sent', 'Pending', 'Failed'], 
    default: 'Pending' 
  },
  noticeDate: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

terminationSchema.index({ employeeEmail: 1, noticeDate: -1 });

module.exports = mongoose.model('Termination', terminationSchema);