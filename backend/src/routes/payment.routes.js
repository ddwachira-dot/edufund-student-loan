const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { round2 } = require('../utils/emi');
const paystack = require('../config/paystack');

const router = express.Router();
const APPLICATION_FEE = 10;

router.use(authenticate);

function isOwner(loan, userId) {
  return String(loan.user_id) === String(userId);
}

async function getLoan(application_id) {
  if (!application_id) return null;
  const { rows } = await pool.query('SELECT * FROM loan_applications WHERE id = $1', [application_id]);
  return rows[0] || null;
}

// Apply a payment against the earliest unpaid EMI instalment (within a transaction)
async function applyEmiPayment(client, loan, userId, amount) {
  const emi = (await client.query(
    `SELECT * FROM emi_schedules
      WHERE application_id = $1 AND status <> 'paid'
      ORDER BY installment_no
      LIMIT 1`,
    [loan.id]
  )).rows[0];
  if (!emi) return { error: 'No outstanding EMI instalments' };

  const payAmt = Math.min(Number(amount), Number(emi.amount) - Number(emi.paid_amount));
  const reference = `PS_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;

  const newPaid = round2(Number(emi.paid_amount) + payAmt);
  const status = newPaid >= Number(emi.amount) - 0.005 ? 'paid' : 'partial';

  await client.query(
    `UPDATE emi_schedules
        SET paid_amount = $1, status = $2::text,
            paid_at = CASE WHEN $2::text = 'paid' THEN NOW() ELSE paid_at END
      WHERE id = $3`,
    [newPaid, status, emi.id]
  );

  await client.query(
    `INSERT INTO payments (user_id, application_id, payment_type, amount, method, reference, status)
     VALUES ($1,$2,'emi',$3,'paystack',$4,'succeeded')`,
    [userId, loan.id, payAmt, reference]
  );

  const open = (await client.query(
    'SELECT COUNT(*)::int AS n FROM emi_schedules WHERE application_id = $1 AND status <> $2::text',
    [loan.id, 'paid']
  )).rows[0].n;
  await client.query(
    "UPDATE loan_applications SET status = CASE WHEN $1 = 0 THEN 'closed' ELSE status END WHERE id = $2",
    [open, loan.id]
  );

  const updatedEmi = (await client.query(
    'SELECT * FROM emi_schedules WHERE id = $1', [emi.id]
  )).rows[0];

  return {
    payment: { amount: payAmt, method: 'paystack', reference },
    emi: updatedEmi,
    remaining_instalments: open,
  };
}

// GET /api/payments  -> caller's payment history
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, la.amount AS loan_amount, la.status AS loan_status, la.university
         FROM payments p
         LEFT JOIN loan_applications la ON la.id = p.application_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT 500`,
      [req.user.id]
    );
    return res.json({ payments: rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/initialize -> open a Paystack checkout for a payment
// body: { application_id, purpose: 'emi' | 'application_fee', amount? }
router.post('/initialize', async (req, res, next) => {
  try {
    const { application_id, purpose, amount } = req.body || {};
    const loan = await getLoan(application_id);
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (!isOwner(loan, req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    let amountUsd;
    if (purpose === 'emi') {
      if (!(Number(amount) > 0)) {
        return res.status(400).json({ message: 'amount (> 0) is required for an EMI payment' });
      }
      const emi = (await pool.query(
        `SELECT id FROM emi_schedules
          WHERE application_id = $1 AND status <> 'paid'
          ORDER BY installment_no LIMIT 1`,
        [loan.id]
      )).rows[0];
      if (!emi) return res.status(400).json({ message: 'No outstanding EMI instalments' });
      amountUsd = Number(amount);
    } else if (purpose === 'application_fee') {
      if (loan.application_fee_paid) {
        return res.status(400).json({ message: 'The $10 application fee is already paid for this loan' });
      }
      amountUsd = APPLICATION_FEE;
    } else {
      return res.status(400).json({ message: "purpose must be 'emi' or 'application_fee'" });
    }

    const reference = `PS_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
    const checkout = await paystack.initialize({
      email: loan.email,
      amount: amountUsd,
      reference,
      metadata: { application_id: loan.id, purpose },
    });

    return res.json({
      authorization_url: checkout.authorization_url,
      reference: checkout.reference,
      access_code: checkout.access_code,
      amount: amountUsd,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/confirm -> verify a Paystack payment and apply it
// body: { application_id, purpose: 'emi' | 'application_fee', reference }
router.post('/confirm', async (req, res, next) => {
  try {
    const { application_id, purpose, reference } = req.body || {};
    if (!application_id || !reference) {
      return res.status(400).json({ message: 'application_id and reference are required' });
    }
    if (!['emi', 'application_fee'].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'emi' or 'application_fee'" });
    }

    const loan = await getLoan(application_id);
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (!isOwner(loan, req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    const tx = await paystack.verify(reference);
    if (tx.status !== 'success') {
      return res.status(400).json({
        message: `Payment was not confirmed by Paystack (status: ${tx.status || 'unknown'})`,
      });
    }

    if (purpose === 'application_fee') {
      if (loan.application_fee_paid) {
        return res.json({ message: 'Application fee already paid', loan });
      }
      await pool.query(
        'UPDATE loan_applications SET application_fee_paid = TRUE WHERE id = $1',
        [loan.id]
      );
      await pool.query(
        `INSERT INTO payments (user_id, application_id, payment_type, amount, method, reference, status)
         VALUES ($1,$2,'application_fee',$3,'paystack',$4,'succeeded')`,
        [req.user.id, loan.id, APPLICATION_FEE, reference]
      );
      const { rows } = await pool.query('SELECT * FROM loan_applications WHERE id = $1', [loan.id]);
      return res.json({ message: 'Application fee paid successfully', loan: rows[0], payment: { amount: APPLICATION_FEE, method: 'paystack', reference } });
    }

    // purpose === 'emi'
    if (!['approved', 'active'].includes(loan.status)) {
      return res.status(400).json({ message: 'No active loan for this application' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await applyEmiPayment(client, loan, req.user.id, tx.amount / 100);
      if (result.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: result.error });
      }
      await client.query('COMMIT');
      return res.json({ message: 'Payment successful', ...result });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      return next(err);
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;