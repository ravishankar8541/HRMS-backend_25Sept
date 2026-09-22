const Salary = require('../models/SalarySlip');
const sendSalarySlipEmail = require('../utils/sendSalarySlip');
const { toWords } = require("number-to-words");

const createSalarySlip = async (req, res) => {
  try {
    const {
      employeeName,
      email,
      empId,
      designation,
      month,
      doj,
      pan,
      aadhar,
      accNo,
      ifsc,
      phone,
      nod,
      basic,
      allowance = 0,
      bonus = 0,
      pf = 0,
      totalLeaveDays = 0,
      otherDeduction = 0,
    } = req.body;

    if (!employeeName || !email || !month || !basic) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: employeeName, email, month, basic',
      });
    }

    const basicAmount = Number(basic || 0);
    const allowanceAmount = Number(allowance || 0);
    const bonusAmount = Number(bonus || 0);
    const grossEarnings = basicAmount + allowanceAmount + bonusAmount;

    const workingDays = Number(nod) > 0 ? Number(nod) : 30;
    const lopDays = Number(totalLeaveDays || 0);

    // Exact financial rounding to 2 decimal places to prevent float bugs like 13333.333
    const rawLop = (grossEarnings / workingDays) * lopDays;
    const lopDeduction = Math.round(rawLop * 100) / 100;

    const pfDeduction = Math.round(Number(pf || 0) * 100) / 100;
    const otherDeductionAmount = Math.round(Number(otherDeduction || 0) * 100) / 100;

    const totalDeductions = Math.round((lopDeduction + pfDeduction + otherDeductionAmount) * 100) / 100;
    const netPayable = Math.round((grossEarnings - totalDeductions) * 100) / 100;

    const salaryRecord = await Salary.create({
      employeeName: employeeName.trim(),
      employeeEmail: email.trim().toLowerCase(),
      employeeId: empId || "N/A",
      designation: designation || "Staff",
      monthYear: month,
      joiningDate: doj,
      panNumber: pan,
      aadharNumber: aadhar,
      bankAccount: accNo,
      ifsc: ifsc,
      phone: phone,
      workingDays,
      lopDays,
      basicSalary: basicAmount,
      allowance: allowanceAmount,
      bonus: bonusAmount,
      pfDeduction: pfDeduction,
      otherDeduction: otherDeductionAmount,
      lopAmount: lopDeduction,
      grossEarnings,
      totalDeductions,
      netPayable,
      emailStatus: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Salary slip generated and saved successfully',
      data: salaryRecord,
    });
  } catch (err) {
    console.error('DATABASE SAVE ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate salary slip record',
      error: err.message,
    });
  }
};

const sendSalaryEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const salaryRecord = await Salary.findById(id);

    if (!salaryRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const roundedNetPay = Math.round(Number(salaryRecord.netPayable) || 0);
    let netPayWords = "";
    try {
      netPayWords = toWords(roundedNetPay);
      // Capitalize first letter of every word
      netPayWords = netPayWords
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } catch (e) {
      netPayWords = String(roundedNetPay);
    }

    const emailData = {
      employeeName: salaryRecord.employeeName,
      employeeId: salaryRecord.employeeId,
      designation: salaryRecord.designation,
      monthYear: salaryRecord.monthYear,
      joiningDate: salaryRecord.joiningDate,
      panNumber: salaryRecord.panNumber,
      aadharNumber: salaryRecord.aadharNumber,
      bankAccount: salaryRecord.bankAccount,
      ifsc: salaryRecord.ifsc || "",
      phone: salaryRecord.phone || "",
      workingDays: salaryRecord.workingDays,
      lopDays: salaryRecord.lopDays,
      basicSalary: salaryRecord.basicSalary,
      allowance: salaryRecord.allowance,
      bonus: salaryRecord.bonus,
      lopAmount: salaryRecord.lopAmount,
      pfDeduction: salaryRecord.pfDeduction,
      otherDeduction: salaryRecord.otherDeduction,
      grossEarnings: salaryRecord.grossEarnings,
      totalDeductions: salaryRecord.totalDeductions,
      netPayable: salaryRecord.netPayable,
      netPayWords: netPayWords,
    };

    await sendSalarySlipEmail(salaryRecord.employeeEmail, emailData);

    salaryRecord.emailStatus = 'Sent';
    await salaryRecord.save();

    return res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error('Send salary email error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createSalarySlip,
  sendSalaryEmail,
};