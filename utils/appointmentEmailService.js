const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const pdf = require('html-pdf');

const sendAppointmentLetter = async (email, data) => {
    // 1. Resolve Template Path
    const templatePath = path.join(__dirname, '../templates/appointmentLetter.ejs');

    // 2. Read Logo as Base64
    let logoBase64 = "";
    try {
        const logoPath = path.join(__dirname, '../assets/blackLogo.png');
        const bitmap = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${bitmap.toString('base64')}`;
    } catch (err) { 
        console.error("Logo missing for Appointment Letter:", err); 
    }

    // 3. Render HTML using EJS
    const html = await ejs.renderFile(templatePath, {
        logo: logoBase64,
        offerId: data.offerId,
        employeeName: data.employeeName,
        fathersName: data.fathersName,
        address: data.address,
        phone: data.phone,             
        email: data.email,
        position: data.position,
        formattedSalary: Number(data.salary).toLocaleString('en-IN'),
        formattedJoiningDate: new Date(data.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        currentDate: new Date().toLocaleDateString('en-IN'),
        hrName: data.hrName
    });

    // 4. Generate PDF using Phantom-based html-pdf (No Puppeteer dependency)
    const options = { format: 'A4', border: '10mm' };

    const pdfBuffer = await new Promise((resolve, reject) => {
        pdf.create(html, options).toBuffer((err, buffer) => {
            if (err) return reject(err);
            resolve(buffer);
        });
    });

    // 5. Construct Email HTML
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="color: #f27022;">Congratulations, ${data.employeeName}!</h2>
        <p>Dear <strong>${data.employeeName}</strong>,</p>
        <p>We are delighted to formally offer you the position of <strong>${data.position}</strong> at <strong>Viral Ads Media</strong>.</p>
        <p>Please find your official <strong>Appointment Letter (Ref: ${data.offerId})</strong> attached.</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #f27022; margin: 20px 0;">
            <strong>Next Steps:</strong><br>
            1. Review the attached document carefully.<br>
            2. Sign and scan the acceptance copy.<br>
            3. Reply with the signed document by <strong>${new Date(data.joiningDate).toLocaleDateString('en-IN')}</strong>.
        </div>
        <p>We look forward to welcoming you to the team!</p>
        <p style="margin-top: 30px;">
            Best Regards,<br>
            <strong>HR Department</strong><br>
            <strong>Viral Ads Media</strong> | Digital Creative Agency
        </p>
    </div>
    `;

    // 6. Setup Transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.titan.email",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 7. Send Mail
    try {
        await transporter.sendMail({
            from: `"Viral Ads Media HR" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Appointment Letter - ${data.employeeName} | ${data.position}`,
            html: emailHtml,
            attachments: [{
                filename: `Appointment_Letter_${data.employeeName.replace(/\s+/g, '_')}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        });
        console.log('Appointment Letter sent successfully to:', email);
    } catch (error) {
        console.error("Email Error:", error);
        throw new Error("Failed to send Appointment Letter email");
    }
};

module.exports = sendAppointmentLetter;