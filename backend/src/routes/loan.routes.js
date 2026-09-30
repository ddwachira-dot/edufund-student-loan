const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { MAX_LOAN_AMOUNT } = require('../config/loan');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.use(authenticate);

function isOwner(loan, userId) {
  return String(loan.user_id) === String(userId);
}

// GET /api/loans  -> list caller's applications
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT la.*,
              (SELECT COUNT(*) FROM emi_schedules e WHERE e.application_id = la.id) AS total_emis,
              (SELECT COUNT(*) FROM emi_schedules e WHERE e.application_id = la.id AND e.status = 'paid') AS paid_emis
         FROM loan_applications la
        WHERE la.user_id = $1
        ORDER BY la.created_at DESC`,
      [req.user.id]
    );
    return res.json({ loans: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/loans/:id  -> detail incl. EMI schedule, documents, payments
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM loan_applications WHERE id = $1', [
      req.params.id,
    ]);
    const loan = rows[0];
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (req.user.role !== 'admin' && !isOwner(loan, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const [emis, docs, pays] = await Promise.all([
      pool.query('SELECT * FROM emi_schedules WHERE application_id = $1 ORDER BY installment_no', [loan.id]),
      pool.query('SELECT id, file_name, stored_name, mime_type, size_bytes, created_at FROM documents WHERE application_id = $1 ORDER BY created_at DESC', [loan.id]),
      pool.query('SELECT id, payment_type, amount, method, reference, status, created_at FROM payments WHERE application_id = $1 ORDER BY created_at DESC', [loan.id]),
    ]);
    return res.json({ loan, emis: emis.rows, documents: docs.rows, payments: pays.rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/loans  -> submit application; the $10 fee is charged via Paystack afterwards
router.post('/', async (req, res, next) => {
  try {
    const {
      amount, duration_months, university, course, monthly_income, purpose, questionnaire,
    } = req.body || {};

    if (!amount || !duration_months || !university || !course) {
      return res.status(400).json({ message: 'amount, duration_months, university and course are required' });
    }
    if (!(Number(amount) > 0)) {
      return res.status(400).json({ message: 'Loan amount must be positive' });
    }
    if (Number(amount) > MAX_LOAN_AMOUNT) {
      return res.status(400).json({ message: `Loan amount cannot exceed $${MAX_LOAN_AMOUNT.toLocaleString()}` });
    }
    const months = Number(duration_months);
    if (!(months >= 1 && months <= 120)) {
      return res.status(400).json({ message: 'duration_months must be between 1 and 120' });
    }

    // Identity document must be uploaded AND approved by an admin first
    const verified = await pool.query(
      `SELECT id FROM verifications
        WHERE user_id = $1 AND status = 'approved'`,
      [req.user.id]
    );
    if (!verified.rows[0]) {
      return res.status(403).json({
        message: 'Your identity document must be approved by an admin before you can apply',
      });
    }

    // The $10 application fee is charged via Paystack after the loan is created
    // (see POST /api/payments/initialize + /confirm)
    const userRow = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRow.rows[0];

    const { rows } = await pool.query(
      `INSERT INTO loan_applications
         (user_id, full_name, email, university, course, amount, duration_months,
          monthly_income, purpose, questionnaire, application_fee_paid, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,'pending')
       RETURNING *`,
      [
        req.user.id,
        user.name,
        user.email,
        university,
        course,
        Number(amount),
        months,
        monthly_income ? Number(monthly_income) : null,
        purpose || null,
        typeof questionnaire === 'object' && questionnaire ? questionnaire : {},
      ]
    );

    const loan = rows[0];

    return res.status(201).json({ loan });
  } catch (err) {
    return next(err);
  }
});

// POST /api/loans/:id/disbursement  -> chosen payout method (after approval)
router.post('/:id/disbursement', async (req, res, next) => {
  try {
    const loan = (await pool.query('SELECT * FROM loan_applications WHERE id = $1', [req.params.id])).rows[0];
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (!isOwner(loan, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (loan.status !== 'active') {
      return res.status(400).json({ message: 'Disbursement is available after the loan is approved' });
    }
    if (loan.disbursed_at) {
      return res.status(400).json({ message: 'This loan has already been disbursed' });
    }

    const { method, account } = req.body || {};
    const METHODS = ['bank', 'airtm', 'paypal'];
    if (!METHODS.includes(method) || !account || !String(account).trim()) {
      return res.status(400).json({
        message: 'Select a valid method (bank, airtm or paypal) and provide your account details',
      });
    }

    const value = String(account).trim();
    if (method === 'paypal' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return res.status(400).json({ message: 'PayPal disbursements require a verified PayPal email address' });
    }
    if (method === 'bank' && value.length < 5) {
      return res.status(400).json({ message: 'Enter your bank account number (and routing number if needed)' });
    }
    if (method === 'airtm' && !/^@?[\w.-]{3,30}$/.test(value)) {
      return res.status(400).json({ message: 'Enter a valid verified AirTM username or registered email' });
    }

    const { rows } = await pool.query(
      `UPDATE loan_applications
          SET disbursement_method = $1, disbursement_account = $2, disbursed_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [method, value, loan.id]
    );
    return res.json({ loan: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// POST /api/loans/:id/documents  -> upload a document for the application
router.post('/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    const loan = (await pool.query('SELECT * FROM loan_applications WHERE id = $1', [req.params.id])).rows[0];
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (req.user.role !== 'admin' && !isOwner(loan, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded (field name: file)' });
    }
    const { rows } = await pool.query(
      `INSERT INTO documents (application_id, user_id, file_name, stored_name, file_path, mime_type, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, file_name, stored_name, mime_type, size_bytes, created_at`,
      [
        loan.id,
        req.user.id,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size,
      ]
    );
    return res.status(201).json({ document: rows[0] });
  } catch (err) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ } }
    return next(err);
  }
});

// DELETE /api/loans/documents/:docId  -> remove a document (owner or admin)
router.delete('/documents/:docId', async (req, res, next) => {
  try {
    const doc = (await pool.query(
      'SELECT * FROM documents WHERE id = $1', [req.params.docId]
    )).rows[0];
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (req.user.role !== 'admin' && String(doc.user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await pool.query('DELETE FROM documents WHERE id = $1', [doc.id]);
    try { fs.unlinkSync(path.join(UPLOAD_DIR, doc.stored_name)); } catch (_) { /* ignore */ }
    return res.json({ message: 'Document deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;