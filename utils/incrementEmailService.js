const deliverDocument = require('./deliverDocument');
const generateIncrementPDF = require('./incrementPdfGenerator');



const sendIncrementLetter = async (to, data) => {
  const transporter = { sendMail: options => deliverDocument(options, 'Increment Letter', data.employeeName, data._snapshotId) };
  const pdfBuffer = data._pdfBuffer || await generateIncrementPDF(data);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
      <h2 style="color: #f27022;">Salary Increment Letter</h2>
      <p>Dear <strong>${data.employeeName}</strong>,</p>
      <p>We are delighted to share that your compensation has been revised in appreciation of your dedication and performance at <strong>Viral Ads Media</strong>.</p>
      <div style="background: #fff8f5; border-left: 4px solid #f27022; padding: 12px; margin: 15px 0;">
        <strong>Increment Highlights:</strong><br>
        Revised Salary: <strong>₹ ${Number(data.newSalary).toLocaleString('en-IN')}/-</strong><br>
        Effective Date: <strong>${new Date(data.effectiveDate).toLocaleDateString('en-IN')}</strong><br>
        Increment Percentage: <strong>${data.incrementPercentage}%</strong>
      </div>
      <p>Your official Increment Letter (Ref: <strong>${data.incrementId}</strong>) is attached to this email.</p>
      <p style="margin-top: 30px;">
        Best Regards,<br>
        <strong>HR Department</strong><br>
        Viral Ads Media
      </p>
    </div>
  `;

  return await transporter.sendMail({
    from: `"Viral Ads Media HR" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Salary Revision Letter | ${data.employeeName} (${data.incrementId})`,
    html: emailHtml,
    attachments: [{
      filename: `Increment_Letter_${data.employeeName.replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });
};

module.exports = sendIncrementLetter;