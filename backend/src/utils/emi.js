// Reducing-balance EMI calculator. Generates full schedule for a loan.
// emi  = P * r * (1+r)^n / ((1+r)^n - 1), with r = annualRatePct / 100 / 12

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function firstOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nextMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/**
 * @param {number} amount           principal
 * @param {number} months           tenure
 * @param {number} annualRatePct    e.g. 8.5
 * @param {Date}   start            first due date (defaults to today)
 * @returns {{emi:number, rows:Array<object>}}
 */
function buildSchedule(amount, months, annualRatePct, start = new Date()) {
  if (months < 1) throw new Error('months must be >= 1');
  const r = annualRatePct / 100 / 12;
  const emi = r === 0
    ? amount / months
    : amount * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);

  let balance = amount;
  const rows = [];
  let due = firstOfMonth(start);

  for (let i = 1; i <= months; i += 1) {
    const interest = balance * r;
    const principal = Math.min(emi - interest, balance);
    balance -= principal;
    rows.push({
      installment_no: i,
      due_date: isoDay(due),
      principal: round2(principal),
      interest: round2(interest),
      amount: round2(principal + interest),
      balance: round2(Math.max(balance, 0)),
    });
    due = nextMonth(due);
  }

  return { emi: round2(emi), rows };
}

module.exports = { buildSchedule, round2 };