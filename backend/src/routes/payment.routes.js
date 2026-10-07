const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { round2 } = require('../utils/emi');
const paystack = require('../config/paystack');
const { APPLICATION_FEE, FEE_CANCEL_NOTE, canPayFee } = require('../config/fees');

const router = express.Router();
const CURRENCY = process.env.PAYSTACK_CURRENCY || 'USD';

router.use(authenticate);

function isOwner(loan, userId) {
  return String(loan.user_id) === String(userId);
}

async function getLoan(application_id) {
  if (!application_id) return null;
  const { rows } = await pool.query('SELECT * FROM loan_applications WHERE id = $1', [application_id]);
  return rows[0] || null;
}

async function alreadyRecorded(client, reference) {
  const { rows } = await client.query('SELECT id FROM payments WHERE reference = $1 LIMIT 1', [reference]);
  return Boolean(rows[0]);
}

// Apply a payment against the earliest unpaid EMI instalment (within a transaction).
// The Paystack reference is stored so a duplicate confirm can never credit twice.
async function applyEmiPayment(client, loan, userId, amount, paystackReference) {
  const emi = (await client.query(
    `SELECT * FROM emi_schedules
      WHERE application_id = $1 AND status <> 'paid'
      ORDER BY installment_no
      LIMIT 1`,
    [loan.id]
  )).rows[0];
  if (!emi) return { error: 'No outstanding EMI instalments' };

  const remaining = Number(emi.amount) - Number(emi.paid_amount);
  if (Number(amount) > remaining + 0.005) {
    return { error: `Amount exceeds the outstanding instalment of $${remaining.toFixed(2)}` };
  }

  const payAmt = Math.min(Number(amount), remaining);
  const reference = paystackReference;

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
// body: { application_id, purpose: 'emi' | 'application_fee', amount?, callback_url? }
router.post('/initialize', async (req, res, next) => {
  try {
    const { application_id, purpose, amount, callback_url } = req.body || {};
    const loan = await getLoan(application_id);
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (!isOwner(loan, req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    let amountUsd;
    if (purpose === 'emi') {
      if (!['approved', 'active'].includes(loan.status)) {
        return res.status(400).json({ message: 'No active loan for this application' });
      }
      const due = (await pool.query(
        `SELECT amount, paid_amount FROM emi_schedules
          WHERE application_id = $1 AND status <> 'paid'
          ORDER BY installment_no LIMIT 1`,
        [loan.id]
      )).rows[0];
      if (!due) return res.status(400).json({ message: 'No outstanding EMI instalments' });

      const remaining = Number(due.amount) - Number(due.paid_amount);
      const emiAmount = Number(amount);
      if (!(emiAmount > 0)) {
        return res.status(400).json({ message: 'amount (> 0) is required for an EMI payment' });
      }
      if (emiAmount > remaining + 0.005) {
        return res.status(400).json({
          message: `Amount exceeds the outstanding instalment of $${remaining.toFixed(2)}`,
        });
      }
      amountUsd = emiAmount;
    } else if (purpose === 'application_fee') {
      if (!canPayFee(loan)) {
        return res.status(400).json({ message: 'The $10 application fee is not payable for this application' });
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
      ...(typeof callback_url === 'string' && /^https?:\/\//.test(callback_url)
        ? { callback_url }
        : {}),
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

// POST /api/payments/cancel -> record a cancelled checkout
// Cancelling the $10 fee checkout auto-rejects the application (until the fee is paid later).
// Cancelling an EMI checkout never changes the loan.
// body: { application_id, purpose: 'emi' | 'application_fee' }
router.post('/cancel', async (req, res, next) => {
  try {
    const { application_id, purpose } = req.body || {};
    const loan = await getLoan(application_id);
    if (!loan) return res.status(404).json({ message: 'Loan application not found' });
    if (!isOwner(loan, req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    if (!['emi', 'application_fee'].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'emi' or 'application_fee'" });
    }
    if (purpose === 'emi') {
      return res.json({ message: 'Payment cancelled', loan });
    }

    const { rows } = await pool.query(
      `UPDATE loan_applications
          SET status = 'rejected', decision_note = $1
        WHERE id = $2 AND application_fee_paid = FALSE AND status IN ('pending', 'draft')
        RETURNING *`,
      [FEE_CANCEL_NOTE, loan.id]
    );
    return res.json({ message: 'Payment cancelled', loan: rows[0] || loan });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/confirm -> verify a Paystack payment and apply it once
// body: { application_id, purpose: 'emi' | 'application_fee', reference }
// The Paystack reference is bound to the purpose + application at initialize time,
// so confirm only accepts a verified transaction that matches, and a reference can
// never be applied twice (guarded by the UNIQUE constraint on payments.reference).
router.post('/confirm', async (req, res, next) => {
  try {
    const { application_id, purpose, reference } = req.body || {};
    if (!application_id || !reference) {
      return res.status(400).json({ message: 'application_id and reference are required' });
    }
    if (!['emi', 'application_fee'].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'emi' or 'application_fee'" });
    }
    if (typeof reference !== 'string' || reference.length > 120) {
      return res.status(400).json({ message: 'Invalid payment reference' });
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
    if (tx.currency && tx.currency !== CURRENCY) {
      return res.status(400).json({
        message: `Payment currency mismatch (expected ${CURRENCY}, got ${tx.currency})`,
      });
    }
    // The reference was minted for exactly this application+purpose; a mismatch means
    // someone is trying to spend one payment against a different loan or purpose.
    const meta = tx.metadata || {};
    if (meta.purpose !== undefined && meta.purpose !== purpose) {
      return res.status(400).json({ message: 'Payment reference does not match this payment purpose' });
    }
    if (meta.application_id !== undefined && String(meta.application_id) !== String(loan.id)) {
      return res.status(400).json({ message: 'Payment reference does not match this application' });
    }

    if (purpose === 'application_fee') {
      if (Number(tx.amount) !== Math.round(APPLICATION_FEE * 100)) {
        return res.status(400).json({ message: `The application fee is $${APPLICATION_FEE}.00` });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (await alreadyRecorded(client, reference)) {
          await client.query('ROLLBACK');
          return res.json({ message: 'Payment already recorded', already_processed: true });
        }
        await client.query(
          `UPDATE loan_applications
              SET application_fee_paid = TRUE,
                  status = CASE WHEN status = 'rejected' AND decision_note = $2 THEN 'pending' ELSE status END,
                  decision_note = CASE WHEN status = 'rejected' AND decision_note = $2 THEN NULL ELSE decision_note END
            WHERE id = $1`,
          [loan.id, FEE_CANCEL_NOTE]
        );
        await client.query(
          `INSERT INTO payments (user_id, application_id, payment_type, amount, method, reference, status)
           VALUES ($1,$2,'application_fee',$3,'paystack',$4,'succeeded')`,
          [req.user.id, loan.id, APPLICATION_FEE, reference]
        );
        const { rows } = await client.query('SELECT * FROM loan_applications WHERE id = $1', [loan.id]);
        await client.query('COMMIT');
        return res.json({
          message: 'Application fee paid successfully',
          loan: rows[0],
          payment: { amount: APPLICATION_FEE, method: 'paystack', reference },
        });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        if (err.code === '23505') {
          return res.json({ message: 'Payment already recorded', already_processed: true });
        }
        return next(err);
      } finally {
        client.release();
      }
    }

    // purpose === 'emi'
    if (!['approved', 'active'].includes(loan.status)) {
      return res.status(400).json({ message: 'No active loan for this application' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (await alreadyRecorded(client, reference)) {
        await client.query('ROLLBACK');
        return res.json({ message: 'Payment already recorded', already_processed: true });
      }
      const result = await applyEmiPayment(client, loan, req.user.id, tx.amount / 100, reference);
      if (result.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: result.error });
      }
      await client.query('COMMIT');
      return res.json({ message: 'Payment successful', ...result });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23505') {
        return res.json({ message: 'Payment already recorded', already_processed: true });
      }
      return next(err);
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;