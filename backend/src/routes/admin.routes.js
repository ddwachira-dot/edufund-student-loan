const express = require('express');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  approveApplication,
  rejectApplication,
  closeAccountAndBan,
  withTransaction,
} = require('../services/loanActions');
const { INTEREST_RATE } = require('../config/loan');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/applications?status=pending
router.get('/applications', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = `
      SELECT la.*, u.name AS applicant_name, u.email AS applicant_email
        FROM loan_applications la
        JOIN users u ON u.id = la.user_id`;
    if (status && status !== 'all') {
      params.push(status);
      sql += ` WHERE la.status = $1`;
    }
    sql += ` ORDER BY la.created_at DESC`;
    const { rows } = await pool.query(sql, params);
    return res.json({ applications: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/applications/:id  -> full detail for review
router.get('/applications/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT la.*, u.name AS applicant_name, u.email AS applicant_email
         FROM loan_applications la JOIN users u ON u.id = la.user_id
        WHERE la.id = $1`, [req.params.id]
    );
    const loan = rows[0];
    if (!loan) return res.status(404).json({ message: 'Application not found' });
    const [emis, docs, pays] = await Promise.all([
      pool.query('SELECT * FROM emi_schedules WHERE application_id = $1 ORDER BY installment_no', [loan.id]),
      pool.query('SELECT id, file_name, stored_name, mime_type, size_bytes, created_at FROM documents WHERE application_id = $1', [loan.id]),
      pool.query('SELECT id, payment_type, amount, method, reference, status, created_at FROM payments WHERE application_id = $1 ORDER BY created_at DESC', [loan.id]),
    ]);
    return res.json({ loan, emis: emis.rows, documents: docs.rows, payments: pays.rows });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/applications/:id/approve
// The interest rate is fixed at 8.5% p.a. for every loan, so no rate selection is required.
router.patch('/applications/:id/approve', async (req, res, next) => {
  try {
    const loan = (await pool.query(
      'SELECT * FROM loan_applications WHERE id = $1', [req.params.id]
    )).rows[0];
    if (!loan) return res.status(404).json({ message: 'Application not found' });

    const result = await withTransaction((client) =>
      approveApplication(client, loan, req.user.id, req.body?.note)
    );
    return res.json({ message: 'Application approved and EMI schedule generated', ...result });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/applications/:id/reject  body: { reason, close_account? }
// close_account=true also closes the owner's account and bans their email.
router.patch('/applications/:id/reject', async (req, res, next) => {
  try {
    const { reason, close_account } = req.body || {};
    const loan = (await pool.query(
      'SELECT la.*, u.email FROM loan_applications la JOIN users u ON u.id = la.user_id WHERE la.id = $1',
      [req.params.id]
    )).rows[0];
    if (!loan) return res.status(404).json({ message: 'Application not found' });

    await withTransaction(async (client) => {
      await rejectApplication(client, loan, req.user.id, reason || null);
      if (close_account) {
        await closeAccountAndBan(
          client,
          { id: loan.user_id, email: loan.email },
          reason || 'Application rejected',
          loan.id
        );
      }
    });
    return res.json({
      message: 'Application rejected',
      reason: reason || null,
      account_closed: Boolean(close_account),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/stats  -> numbers + chart series for the admin dashboard
router.get('/stats', async (req, res, next) => {
  try {
    const [counts, money, disbursedByMonth, paymentsByMonth, recent, rates] = await Promise.all([
      pool.query(`SELECT status, COUNT(*)::int AS n FROM loan_applications GROUP BY status`),
      pool.query(`SELECT
          COALESCE(SUM(CASE WHEN p.payment_type = 'application_fee' THEN p.amount END), 0)   AS fee_revenue,
          COALESCE(SUM(CASE WHEN p.payment_type = 'emi' THEN p.amount END), 0)               AS emi_collected,
          COALESCE(SUM(CASE WHEN la.status IN ('active','closed') THEN la.amount END), 0)    AS total_disbursed
        FROM payments p
        LEFT JOIN loan_applications la ON la.id = p.application_id`),
      pool.query(`SELECT
          TO_CHAR(DATE_TRUNC('month', COALESCE(approved_at, created_at)), 'YYYY-MM') AS month,
          COUNT(*)::int AS count,
          COALESCE(SUM(amount), 0) AS total
        FROM loan_applications
        WHERE status IN ('active','closed')
        GROUP BY 1 ORDER BY 1`),
      pool.query(`SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN payment_type = 'emi' THEN amount END), 0) AS emi_payments,
          COALESCE(SUM(CASE WHEN payment_type = 'application_fee' THEN amount END), 0) AS fees
        FROM payments GROUP BY 1 ORDER BY 1`),
      pool.query(`SELECT p.amount, p.payment_type, p.created_at, u.name
        FROM payments p JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC LIMIT 10`),
      pool.query(`SELECT id, label, rate, is_active, created_at FROM interest_rates ORDER BY created_at DESC`),
    ]);

    const byStatus = counts.rows.reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});
    return res.json({
      byStatus,
      totals: money.rows[0],
      disbursedByMonth: disbursedByMonth.rows,
      paymentsByMonth: paymentsByMonth.rows,
      recentPayments: recent.rows,
      rates: rates.rows,
    });
  } catch (err) {
    return next(err);
  }
});

// ------------------------- Interest rate management -------------------------

// GET /api/admin/rates  -> read-only: the rate is fixed at 8.5% p.a. for every loan
router.get('/rates', (req, res) => {
  return res.json({
    fixed: true,
    rate: {
      id: null,
      label: 'Standard Fixed Rate',
      rate: INTEREST_RATE,
      is_active: true,
      updated_by_name: 'System',
    },
    rates: [],
  });
});

// GET /api/admin/verifications?status=pending|approved|rejected|all
router.get('/verifications', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = `
      SELECT v.*, u.name AS applicant_name, u.email AS applicant_email,
             b.method AS billing_method, b.full_name AS billing_full_name,
             b.address AS billing_address, b.city AS billing_city, b.state AS billing_state,
             b.zip AS billing_zip, b.country AS billing_country,
             b.bank_name AS billing_bank_name, b.account_holder AS billing_account_holder,
             b.account_number AS billing_account_number, b.routing_number AS billing_routing_number,
             b.airtm_handle AS billing_airtm_handle, b.paypal_email AS billing_paypal_email,
             b.updated_at AS billing_updated_at
        FROM verifications v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN billing_details b ON b.user_id = v.user_id`;
    if (status && status !== 'all') {
      params.push(status);
      sql += ` WHERE v.status = $1`;
    }
    sql += ` ORDER BY v.created_at DESC`;
    const { rows } = await pool.query(sql, params);
    return res.json({ verifications: rows });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/verifications/:id/approve
router.patch('/verifications/:id/approve', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE verifications
          SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_note = NULL
        WHERE id = $1
        RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Verification not found' });
    return res.json({ verification: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/verifications/:id/reject  body: { reason? }
router.patch('/verifications/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE verifications
          SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_note = $3
        WHERE id = $1
        RETURNING *`,
      [req.params.id, req.user.id, reason || null]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Verification not found' });
    return res.json({ verification: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ----------------------------- Banned emails -----------------------------

// GET /api/admin/banned -> active bans (pass ?include_released=true for history)
router.get('/banned', async (req, res, next) => {
  try {
    const includeReleased = req.query.include_released === 'true';
    const { rows } = await pool.query(
      `SELECT b.*, u.name AS user_name
         FROM banned_emails b
         LEFT JOIN users u ON u.id = b.user_id
        ${includeReleased ? '' : 'WHERE b.released_at IS NULL'}
        ORDER BY b.banned_at DESC`
    );
    return res.json({ banned: rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/banned/:email/release -> lift the ban and reopen the account
router.post('/banned/:email/release', async (req, res, next) => {
  try {
    const email = String(req.params.email).toLowerCase();
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE banned_emails SET released_at = NOW(), released_by = $2
          WHERE email = $1 AND released_at IS NULL`,
        [email, req.user.id]
      );
      await client.query(
        'UPDATE users SET closed_at = NULL, closed_reason = NULL WHERE email = $1',
        [email]
      );
    });
    return res.json({ message: `Ban released for ${email}` });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;