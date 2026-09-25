const fields = ['pendingSalary','leaveEncashment','incentive','gratuity','noticeRecovery','deductions'];
exports.calculate = body => {
  const amounts = {};
  for (const field of fields) {
    const value = body[field] ?? 0;
    if (!['string','number'].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1e9) {
      throw Object.assign(new Error(`${field} must be a non-negative amount up to 1 billion`), { status: 400 });
    }
    amounts[field] = Math.round(Number(value) * 100);
  }
  const net = amounts.pendingSalary + amounts.leaveEncashment + amounts.incentive + amounts.gratuity - amounts.noticeRecovery - amounts.deductions;
  return { ...Object.fromEntries(fields.map(f => [f, amounts[f]/100])), totalPayable: net/100 };
};
exports.validateDates = body => {
  const dates = [body.dateOfJoining, body.lastWorkingDay];
  if (dates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d || '') || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10) !== d) || dates[1] < dates[0]) {
    throw Object.assign(new Error('Valid joining and last working dates are required; last working day cannot precede joining'), { status: 400 });
  }
};
