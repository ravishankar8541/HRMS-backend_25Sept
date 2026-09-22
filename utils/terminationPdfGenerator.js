const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Helper to find and read images as Base64
const getAssetBase64 = (filename) => {
  const searchPaths = [
    path.join(__dirname, '../assets', filename),
    path.join(__dirname, '../public', filename),
    path.join(process.cwd(), 'assets', filename),
    path.join(process.cwd(), 'public', filename),
    path.join(__dirname, '../../frontend/public', filename),
    path.join(__dirname, '../../HRMS-frontend-21Sept/public', filename),
    path.join(process.cwd(), '../public', filename),
  ];

  for (const filePath of searchPaths) {
    if (fs.existsSync(filePath)) {
      try {
        const bitmap = fs.readFileSync(filePath);
        return `data:image/png;base64,${bitmap.toString('base64')}`;
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
  }
  return "";
};

const generateTerminationPDF = async (data) => {
  const templatePath = path.join(__dirname, '../templates/terminationLetter.ejs');
  
  // 1. Load Logo and HR Signature
  const logoBase64 = getAssetBase64('blackLogo.png');
  const hrSignatureBase64 = getAssetBase64('hrSignature.png');

  // 2. Render HTML with EJS
  const html = await ejs.renderFile(templatePath, {
    logo: logoBase64,
    hrSignature: hrSignatureBase64,
    noticeDate: formatDate(data.noticeDate || new Date()),
    name: data.name || data.employeeName,
    email: data.email || 'N/A',
    contact: data.phoneNumber || 'N/A',
    designation: data.designation,
    lastWorkingDate: formatDate(data.lastWorkingDate),
    reason: data.reason || 'review of organizational requirements',
    hrName: data.hrName || 'HR Manager',
    companyAddress: 'B-27, Budh Vihar Phase 1, Delhi-110086'
  });

  const options = { 
    format: 'A4', 
    border: { top: '10mm', right: '15mm', bottom: '15mm', left: '15mm' },
    type: "pdf",
    quality: "100"
  };

  return new Promise((resolve, reject) => {
    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
};

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

module.exports = generateTerminationPDF;