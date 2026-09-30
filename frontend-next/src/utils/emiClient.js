// Reducing-balance EMI formulas shared by the landing calculators.
export function computeEmi(amount, months, annualRatePct) {
  const a = Math.max(0, Number(amount) || 0);
  const n = Math.max(1, Math.round(Number(months) || 0));
  if (a === 0) return { emi: 0, total: 0, interest: 0, principalRatio: 0 };
  const r = (Number(annualRatePct) || 0) / 100 / 12;
  const emiVal = r === 0 ? a / n : (a * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emiVal * n;
  return {
    emi: emiVal,
    total,
    interest: Math.max(0, total - a),
    principalRatio: total === 0 ? 0 : (a / total) * 100,
  };
}

export function money(n, digits = 0) {
  return `$${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}