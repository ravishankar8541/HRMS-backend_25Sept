const nodemailer = require('nodemailer');
const { cloudinary } = require('../config/cloudinary');
const Delivery = require('../models/DocumentDelivery');

// Store the exact attachment before sending. Failed sends never enter the wallet.
module.exports = async (options, docType, employeeName, snapshotId) => {
  const recipient = String(options.to || '').trim().toLowerCase();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient)) throw new Error('A single valid recipient email is required');
  const attachment = options.attachments?.[0];
  if (!attachment?.content) throw new Error('Document attachment is missing');
  const snapshot = snapshotId ? await Delivery.findById(snapshotId) : null;
  const asset = snapshot ? {public_id:snapshot.publicId} : await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: 'raw', type: 'authenticated', folder: 'hrms/deliveries' },
      (error, result) => error ? reject(error) : resolve(result)).end(Buffer.from(attachment.content));
  });
  let delivery;
  try { delivery = await Delivery.create({ recipient, docType, employeeName, filename: attachment.filename, publicId: asset.public_id, refNo: snapshot?.refNo || attachment.filename, sourceId: snapshot?.sourceId }); }
  catch (error) { if (!snapshot) await cloudinary.uploader.destroy(asset.public_id, { resource_type: 'raw', type: 'authenticated' }).catch(()=>{}); throw error; }
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email', port, secure: port === 465,
    connectionTimeout: 15000, socketTimeout: 60000,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  try {
    const info = await transporter.sendMail({ ...options, to: recipient });
    if (!info.accepted?.length) throw new Error('Mail server did not accept the recipient');
    delivery.status = 'Sent'; delivery.sentAt = new Date();
    await delivery.save();
    return info;
  } catch (error) {
    delivery.status = 'Failed';
    await delivery.save();
    throw error;
  }
};
