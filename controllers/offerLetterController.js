const OfferLetter = require('../models/OfferLetter');
const sendOfferLetter = require('../utils/emailService');

const createOffer = async (req, res) => {
  try {
    const { 
      employeeName, 
      fathersName,   
      address, 
      phoneNumber,   
      emailId,       
      position, 
      salary, 
      joiningDate, 
      hrName 
    } = req.body;

    if (!employeeName || !emailId || !position || !salary || !joiningDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: employeeName, emailId, position, salary, joiningDate' 
      });
    }

    const offerId = `HRMS/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const offer = await OfferLetter.create({
      offerId,
      employeeName: employeeName.trim(),
      fathersName: fathersName ? fathersName.trim() : 'N/A',   
      address: address ? address.trim() : 'N/A',
      phoneNumber: phoneNumber ? phoneNumber.trim() : 'N/A',   
      emailId: emailId.trim().toLowerCase(),       
      position: position.trim(),
      salary: Number(salary),
      joiningDate: new Date(joiningDate),
      hrName: hrName ? hrName.trim() : 'HR Manager',
    });

    return res.status(201).json({ success: true, offerId, data: offer });
  } catch (err) {
    console.error("Create Offer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const offer = await OfferLetter.findById(id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    const recipient = email ? email.trim() : offer.emailId;
    await sendOfferLetter(recipient, offer);

    return res.json({ success: true, message: 'Offer letter sent successfully with PDF attachment' });
  } catch (err) {
    console.error("Send Offer Email Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createOffer, sendEmail };