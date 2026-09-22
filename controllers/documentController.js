const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const OfferLetter = require('../models/OfferLetter');
const AppointmentLetter = require('../models/AppointmentLetter');
const IncrementLetter = require('../models/IncrementLetter');
const SalarySlip = require('../models/SalarySlip');
const FNF = require('../models/FNF');
const Termination = require('../models/TerminationLetter');

const generateOfferPDF = require('../utils/pdfGenerator');
const generateIncrementPDF = require('../utils/incrementPdfGenerator');
const generateTerminationPDF = require('../utils/terminationPdfGenerator');
const generateFNFPDF = require('../utils/generateFNFPDF');
const { generateAppointmentPDFBuffer } = require('../utils/appointmentEmailService');
const pdf = require('html-pdf');
const ejs = require('ejs');

const normalizeDocType = (value) =>
  String(value || '').toLowerCase().replace(/[\s_-]+/g, '');

const matchesDocType = (docType, filterType) =>
  normalizeDocType(docType) === normalizeDocType(filterType);

const renderSalarySlipPDF = async (doc) => {
  const tpl = path.join(__dirname, '../templates/salarySlip.ejs');
  const formatINR = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const html = await ejs.renderFile(tpl, {
    logo: getAssetBase64('blackLogo.png'),
    hrSignature: getAssetBase64('hrSignature.png'),
    companyName: 'VIRAL ADS MEDIA',
    payMonth: doc.monthYear || '—',
    netPayWords: doc.netPayWords || '',
    employeeName: doc.employeeName || '—',
    employeeId: doc.employeeId || '—',
    designation: doc.designation || '—',
    joiningDate: doc.joiningDate || '—',
    panNumber: doc.panNumber || '—',
    aadharNumber: doc.aadharNumber || '—',
    bankAccount: doc.bankAccount || '—',
    ifsc: doc.ifsc || '—',
    phone: doc.phone || '—',
    workingDays: doc.workingDays || 30,
    lopDays: doc.lopDays || 0,
    basicSalary: formatINR(doc.basicSalary),
    allowance: formatINR(doc.allowance),
    bonus: formatINR(doc.bonus),
    lopAmount: formatINR(doc.lopAmount),
    pfDeduction: formatINR(doc.pfDeduction),
    otherDeduction: formatINR(doc.otherDeduction),
    grossEarnings: formatINR(doc.grossEarnings),
    totalDeductions: formatINR(doc.totalDeductions),
    netPayable: formatINR(doc.netPayable),
  });
  return new Promise((resolve, reject) => {
    pdf.create(html, { format: 'A4', border: { top: '8mm', right: '10mm', bottom: '8mm', left: '10mm' } }).toBuffer((err, b) => (err ? reject(err) : resolve(b)));
  });
};

const getAssetBase64 = (filename) => {
  const searchDirs = [
    path.join(__dirname, '../assets', filename),
    path.join(__dirname, '../public', filename),
    path.join(process.cwd(), 'assets', filename),
    path.join(__dirname, '../../frontend/public', filename),
    path.join(__dirname, '../../HRMS-frontend-21Sept/public', filename),
  ];
  for (const d of searchDirs) {
    if (fs.existsSync(d)) {
      try {
        const b = fs.readFileSync(d);
        return `data:image/png;base64,${b.toString('base64')}`;
      } catch (e) {}
    }
  }
  return '';
};

exports.getAllDocuments = async (req, res) => {
  try {
    const { type, search, email } = req.query;

    const [offers, appointments, increments, salaries, fnfs, terminations] = await Promise.all([
      OfferLetter.find().sort({ createdAt: -1 }).lean(),
      AppointmentLetter.find().sort({ createdAt: -1 }).lean(),
      IncrementLetter.find().sort({ createdAt: -1 }).lean(),
      SalarySlip.find().sort({ createdAt: -1 }).lean(),
      FNF.find().sort({ createdAt: -1 }).lean(),
      Termination.find().sort({ createdAt: -1 }).lean(),
    ]);

    let docs = [];

    offers.forEach(o => docs.push({
      _id: o._id,
      docType: 'Offer Letter',
      refNo: o.offerId,
      employeeName: o.employeeName,
      email: o.emailId,
      phone: o.phoneNumber,
      position: o.position,
      date: o.createdAt || o.joiningDate,
      status: 'Issued'
    }));

    appointments.forEach(a => docs.push({
      _id: a._id,
      docType: 'Appointment Letter',
      refNo: a.offerId,
      employeeName: a.employeeName,
      email: a.email,
      phone: a.phone,
      position: a.position,
      date: a.createdAt || a.joiningDate,
      status: 'Issued'
    }));

    increments.forEach(i => docs.push({
      _id: i._id,
      docType: 'Increment Letter',
      refNo: i.incrementId,
      employeeName: i.employeeName,
      email: i.emailId,
      phone: i.phoneNumber,
      position: i.position,
      date: i.createdAt || i.effectiveDate,
      status: i.emailStatus || 'Issued'
    }));

    salaries.forEach(s => docs.push({
      _id: s._id,
      docType: 'Salary Slip',
      refNo: s.monthYear,
      employeeName: s.employeeName,
      email: s.employeeEmail,
      phone: s.phone,
      position: s.designation,
      date: s.createdAt,
      status: s.emailStatus || 'Sent'
    }));

    fnfs.forEach(f => docs.push({
      _id: f._id,
      docType: 'FNF Settlement',
      refNo: f.employeeId,
      employeeName: f.employeeName,
      email: f.email,
      phone: f.phone,
      position: f.designation,
      date: f.createdAt,
      status: 'Settled'
    }));

    terminations.forEach(t => docs.push({
      _id: t._id,
      docType: 'Termination Letter',
      refNo: `TM-${t._id.toString().slice(-4).toUpperCase()}`,
      employeeName: t.employeeName,
      email: t.employeeEmail,
      phone: t.employeePhone,
      position: t.designation,
      date: t.noticeDate || t.createdAt,
      status: t.emailStatus || 'Issued'
    }));

    if (type && type !== 'ALL') {
      docs = docs.filter((d) => matchesDocType(d.docType, type));
    }

    if (email) {
      docs = docs.filter(d => d.email && d.email.toLowerCase() === email.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(d =>
        (d.employeeName && d.employeeName.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.refNo && d.refNo.toLowerCase().includes(q))
      );
    }

    docs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.previewDocumentPDF = async (req, res) => {
  try {
    const { type, id } = req.params;
    let pdfBuffer;
    let filename = `Document_${id}.pdf`;
    const cleanType = type.toLowerCase().replace(/\s+/g, '');

    if (cleanType.includes('offer')) {
      const doc = await OfferLetter.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await generateOfferPDF(doc);
      filename = `Offer_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    } else if (cleanType.includes('increment')) {
      const doc = await IncrementLetter.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await generateIncrementPDF(doc);
      filename = `Increment_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    } else if (cleanType.includes('appointment')) {
      const doc = await AppointmentLetter.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await generateAppointmentPDFBuffer(doc);
      filename = `Appointment_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    } else if (cleanType.includes('salary')) {
      const doc = await SalarySlip.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await renderSalarySlipPDF(doc);
      filename = `Payslip_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    } else if (cleanType.includes('fnf')) {
      const doc = await FNF.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await generateFNFPDF(doc);
      filename = `FNF_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    } else if (cleanType.includes('termination')) {
      const doc = await Termination.findById(id);
      if (!doc) return res.status(404).send('Document not found');
      pdfBuffer = await generateTerminationPDF(doc);
      filename = `Termination_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
    }

    if (!pdfBuffer) return res.status(400).send('Invalid document type');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  } catch (err) {
    return res.status(500).send('Preview generation failed: ' + err.message);
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { type, id } = req.params;
    const cleanType = type.toLowerCase().replace(/\s+/g, '');

    let deleted = null;
    if (cleanType.includes('offer')) deleted = await OfferLetter.findByIdAndDelete(id);
    else if (cleanType.includes('appointment')) deleted = await AppointmentLetter.findByIdAndDelete(id);
    else if (cleanType.includes('increment')) deleted = await IncrementLetter.findByIdAndDelete(id);
    else if (cleanType.includes('salary')) deleted = await SalarySlip.findByIdAndDelete(id);
    else if (cleanType.includes('fnf')) deleted = await FNF.findByIdAndDelete(id);
    else if (cleanType.includes('termination')) deleted = await Termination.findByIdAndDelete(id);
    else return res.status(400).json({ success: false, message: 'Invalid Type' });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    return res.json({ success: true, message: 'Document removed from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkDownload = async (req, res) => {
  try {
    const { documents } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents selected' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`HRMS_Documents_${Date.now()}.zip`);
    archive.pipe(res);

    for (let i = 0; i < documents.length; i++) {
      const item = documents[i];
      try {
        const cleanType = (item.docType || '').toLowerCase();
        let buffer;
        let fname = `doc_${i + 1}.pdf`;

        if (cleanType.includes('offer')) {
          const doc = await OfferLetter.findById(item._id);
          if (doc) {
            buffer = await generateOfferPDF(doc);
            fname = `Offer_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
          }
        } else if (cleanType.includes('appointment')) {
          const doc = await AppointmentLetter.findById(item._id);
          if (doc) {
            buffer = await generateAppointmentPDFBuffer(doc);
            fname = `Appointment_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
          }
        } else if (cleanType.includes('increment')) {
          const doc = await IncrementLetter.findById(item._id);
          if (doc) {
            buffer = await generateIncrementPDF(doc);
            fname = `Increment_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
          }
        } else if (cleanType.includes('salary')) {
          const doc = await SalarySlip.findById(item._id);
          if (doc) {
            buffer = await renderSalarySlipPDF(doc);
            fname = `Payslip_${doc.employeeName.replace(/\s+/g, '_')}_${doc.monthYear || ''}.pdf`;
          }
        } else if (cleanType.includes('fnf')) {
          const doc = await FNF.findById(item._id);
          if (doc) {
            buffer = await generateFNFPDF(doc);
            fname = `FNF_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
          }
        } else if (cleanType.includes('termination')) {
          const doc = await Termination.findById(item._id);
          if (doc) {
            buffer = await generateTerminationPDF(doc);
            fname = `Termination_${doc.employeeName.replace(/\s+/g, '_')}.pdf`;
          }
        }

        if (buffer) archive.append(buffer, { name: fname });
      } catch (e) {}
    }
    await archive.finalize();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};