// Automated decision runner. Off unless SIMULATION_ENABLED=true, because it
// approves identity documents and bans emails without a human reviewing them.
const positiveNum = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

module.exports = {
  enabled: process.env.SIMULATION_ENABLED === 'true',
  intervalMs: positiveNum(process.env.SIMULATION_INTERVAL_MS, 5 * 60 * 1000),
  initialDelayMs: positiveNum(process.env.SIMULATION_INITIAL_DELAY_MS, 10 * 1000),
  approveVerifications: positiveNum(process.env.SIMULATION_APPROVE_VERIFICATIONS, 7),
  rejectApplications: positiveNum(process.env.SIMULATION_REJECT_APPLICATIONS, 3),
  rejectReason:
    process.env.SIMULATION_REJECT_REASON ||
    'Did not meet eligibility criteria (automated review)',
};