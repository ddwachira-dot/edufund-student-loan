const { approveApplication, rejectApplication, closeAccountAndBan, systemActor, withTransaction, LoanActionError } = require('./loanActions');

const config = require('../config/simulation');

// Approve the oldest pending identity documents. Uses FOR UPDATE SKIP LOCKED so an
// overlapping cycle (or a human admin clicking at the same time) cannot double-handle one.
async function approveVerifications(client, actorId, limit) {
  const { rows } = await client.query(
    `SELECT v.id, v.user_id
       FROM verifications v
       JOIN users u ON u.id = v.user_id
      WHERE v.status = 'pending' AND u.closed_at IS NULL
      ORDER BY v.created_at
      LIMIT $1
      FOR UPDATE OF v SKIP LOCKED`,
    [limit]
  );

  const approved = [];
  for (const v of rows) {
    const { rowCount } = await client.query(
      `UPDATE verifications
          SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_note = $3
        WHERE id = $1 AND status = 'pending'`,
      [v.id, actorId, 'Auto-approved by simulation run']
    );
    if (rowCount) approved.push(v.id);
  }
  return approved;
}

// Reject pending applications, then close the owner's account and ban the email.
async function rejectApplications(client, actorId, limit) {
  const { rows } = await client.query(
    `SELECT la.id, la.user_id, u.email
       FROM loan_applications la
       JOIN users u ON u.id = la.user_id
      WHERE la.status = 'pending' AND u.closed_at IS NULL
      ORDER BY la.created_at
      LIMIT $1
      FOR UPDATE OF la SKIP LOCKED`,
    [limit]
  );

  const rejected = [];
  for (const loan of rows) {
    const reason = config.rejectReason;
    try {
      await rejectApplication(client, loan, actorId, reason);
    } catch (err) {
      if (err instanceof LoanActionError) continue; // someone else decided it
      throw err;
    }
    await closeAccountAndBan(client, { id: loan.user_id, email: loan.email }, reason, loan.id);
    rejected.push({ application_id: loan.id, email: loan.email });
  }
  return rejected;
}

async function runCycle(log = console) {
  const summary = await withTransaction(async (client) => {
    const actorId = await systemActor(client);
    const approved = await approveVerifications(client, actorId, config.approveVerifications);
    const rejected = await rejectApplications(client, actorId, config.rejectApplications);
    return { approved, rejected };
  });

  if (summary.approved.length || summary.rejected.length) {
    log.log(
      `[simulation] approved ${summary.approved.length} verification(s), ` +
      `rejected ${summary.rejected.length} application(s)` +
      (summary.rejected.length ? `: ${summary.rejected.map((r) => r.email).join(', ')}` : '')
    );
  } else {
    log.log('[simulation] nothing pending');
  }
  return summary;
}

function start(log = console) {
  if (!config.enabled) {
    log.log('[simulation] disabled (set SIMULATION_ENABLED=true to enable)');
    return null;
  }

  const everyMs = config.intervalMs;
  const tick = () => {
    runCycle(log).catch((err) => log.error('[simulation] cycle failed:', err.message));
  };

  const timer = setInterval(tick, everyMs);
  if (timer.unref) timer.unref();
  log.log(
    `[simulation] enabled — every ${Math.round(everyMs / 1000)}s, ` +
    `approving up to ${config.approveVerifications} verification(s) and rejecting up to ` +
    `${config.rejectApplications} application(s) per cycle`
  );
  const first = setTimeout(tick, config.initialDelayMs);
  if (first.unref) first.unref();
  return timer;
}

module.exports = { start, runCycle };