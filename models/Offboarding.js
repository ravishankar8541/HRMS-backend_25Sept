const mongoose = require("mongoose");

const OffboardingSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  lastWorkingDay: { type: Date, required: true },
  reason: String,
  laptopReturned: Boolean,
  idCardReturned: Boolean,
  clearanceApproved: Boolean,
  exitInterview: String,
}, { timestamps: true });

module.exports = mongoose.model("Offboarding", OffboardingSchema);