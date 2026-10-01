const pool = require('../config/db');
const { buildSchedule } = require('../utils/emi');
const { INTEREST_RATE } = require('../config/loan');

class LoanActionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Approve a pending application: snapshot the fixed rate and write the schedule.
// Must be called with a client already inside a transaction.
async function approveApplication(client, loan, adminId, note) {
  if (loan.status !== 'pending') {
    throw new LoanActionError(`Cannot approve an application with status '${loan.status}'`);
  }

  const { emi, rows } = buildSchedule(
    Number(loan.amount),
    Number(loan.duration_months),
    INTEREST_RATE
  );

  await client.query(
    `UPDATE loan_applications
        SET status = 'active', interest_rate = $1, approved_by = $2, approved_at = NOW(),
            decision_note = $4
      WHERE id = $3`,
    [INTEREST_RATE, adminId, loan.id, note || `Approved at ${INTEREST_RATE}% p.a.`]
  );

  for (const r of rows) {
    await client.query(
      `INSERT INTO emi_schedules
         (application_id, installment_no, due_date, principal, interest, amount)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [loan.id, r.installment_no, r.due_date, r.principal, r.interest, r.amount]
    );
  }

  return { emi, rate: INTEREST_RATE, schedule_rows: rows.length };
}

// Reject a pending application. Must run inside a transaction with the same client.
async function rejectApplication(client, loan, adminId, reason) {
  const { rowCount } = await client.query(
    `UPDATE loan_applications
        SET status = 'rejected', approved_by = $1, approved_at = NOW(), decision_note = $3
      WHERE id = $2 AND status = 'pending'`,
    [adminId, loan.id, reason || null]
  );
  if (!rowCount) {
    throw new LoanActionError('Application not found or not pending');
  }
}

// Close an account and block its email from registering or logging in.
// Must run inside a transaction with the same client.
async function closeAccountAndBan(client, user, reason, applicationId) {
  await client.query(
    'UPDATE users SET closed_at = NOW(), closed_reason = $2 WHERE id = $1',
    [user.id, reason]
  );
  await client.query(
    `INSERT INTO banned_emails (email, reason, user_id, application_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET reason = EXCLUDED.reason, banned_at = NOW(), released_at = NULL, released_by = NULL`,
    [String(user.email).toLowerCase(), reason, user.id, applicationId || null]
  );
}

// Resolve an actor for automated decisions: the lowest-id admin, or null.
async function systemActor(client) {
  const { rows } = await client.query(
    "SELECT id FROM users WHERE role = 'admin' AND closed_at IS NULL ORDER BY id LIMIT 1"
  );
  return rows[0]?.id || null;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  approveApplication,
  rejectApplication,
  closeAccountAndBan,
  systemActor,
  withTransaction,
  LoanActionError,
};