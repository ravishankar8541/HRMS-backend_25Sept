const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const generateSalarySlipPDF = async (data) => {
  try {
    const templatePath = path.join(__dirname, '../templates/salarySlip.ejs');

    let logoBase64 = "";
    try {
      const logoPath = path.join(__dirname, '../assets/blackLogo.png');
      const bitmap = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${bitmap.toString('base64')}`;
    } catch (err) {
      console.warn("Logo not found at backend/assets/blackLogo.png");
    }

    const html = await ejs.renderFile(templatePath, {
      logo: logoBase64,
      companyName: 'VIRAL ADS MEDIA',
      companyAddress: 'B-27, Budh Vihar Phase 1, New Delhi-110086',
      payMonth: data.monthYear || '—',
      netPayWords: data.netPayWords || "",
      employeeName: data.employeeName || '—',
      employeeId: data.employeeId || '—',
      designation: data.designation || '—',
      joiningDate: data.joiningDate || '—',
      panNumber: data.panNumber || '—',
      aadharNumber: data.aadharNumber || '—',
      bankAccount: data.bankAccount || '—',
      ifsc: data.ifsc || '—',
      phone: data.phone || '—',
      workingDays: data.workingDays || 30,
      lopDays: data.lopDays || 0,
      basicSalary: Number(data.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      allowance: Number(data.allowance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      bonus: Number(data.bonus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      lopAmount: Number(data.lopAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      pfDeduction: Number(data.pfDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      otherDeduction: Number(data.otherDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      grossEarnings: Number(data.grossEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      totalDeductions: Number(data.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      netPayable: Number(data.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      hrName: 'Authorised Signatory'
    });

    // CRITICAL: Add these options to force HTML rendering
    const options = {
      format: 'A4',
      border: {
        top: '8mm',
        right: '10mm',
        bottom: '8mm',
        left: '10mm'
      },
      quality: '100',
      type: 'pdf',
      // Add these to ensure proper rendering
      renderDelay: 1000,
      timeout: 30000,
      zoomFactor: 0.75
    };

    return new Promise((resolve, reject) => {
      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('PDF generation error:', err);
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });

  } catch (error) {
    console.error('Error in generateSalarySlipPDF:', error);
    throw error;
  }
};

module.exports = generateSalarySlipPDF;