const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipient: { type: String, required: true, trim: true, lowercase: true },
  docType: { type: String, required: true },
  employeeName: String,
  refNo: String,
  filename: String,
  publicId: { type: String, required: true },
  sourceId: String,
  snapshotKey: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['Generated', 'Pending', 'Sent', 'Failed'], default: 'Pending' },
  sentAt: Date,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ recipient: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('DocumentDelivery', schema);
