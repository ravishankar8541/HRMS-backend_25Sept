const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const generateIncrementPDF = async (data) => {
  const templatePath = path.join(__dirname, '../templates/incrementLetter.ejs');

  let logoBase64 = "";
  try {
    const logoPath = path.join(__dirname, '../assets/blackLogo.png');
    if (fs.existsSync(logoPath)) {
      const bitmap = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${bitmap.toString('base64')}`;
    }
  } catch (err) {
    console.error("Increment Letter Logo loading error:", err);
  }

  const html = await ejs.renderFile(templatePath, {
    logo: logoBase64,
    incrementId: data.incrementId,
    employeeName: data.employeeName,
    fathersName: data.fathersName,
    address: data.address,
    phoneNumber: data.phoneNumber,
    emailId: data.emailId,
    employeeId: data.employeeId,
    department: data.department,
    position: data.position,
    incrementPercentage: data.incrementPercentage,
    formattedCurrentSalary: Number(data.currentSalary).toLocaleString('en-IN'),
    formattedNewSalary: Number(data.newSalary).toLocaleString('en-IN'),
    formattedEffectiveDate: new Date(data.effectiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    currentDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    hrName: data.hrName || 'HR Manager',
    performanceRemarks: data.performanceRemarks || '',
    reasonForIncrement: data.reasonForIncrement || 'Performance and annual review'
  });

  const options = {
    format: 'A4',
    border: { top: '10mm', right: '15mm', bottom: '10mm', left: '15mm' },
    quality: '100'
  };

  return new Promise((resolve, reject) => {
    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
};

module.exports = generateIncrementPDF;