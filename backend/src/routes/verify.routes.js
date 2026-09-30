const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

const DOC_TYPES = {
  drivers_license: 'US driver’s license',
  passport: 'passport',
};

const FIELDS = 'id, user_id, doc_type, file_name, stored_name, mime_type, size_bytes, status, review_note, created_at';
const BILLING_FIELDS = 'user_id, method, full_name, address, city, state, zip, country, bank_name, account_holder, account_number, routing_number, airtm_handle, paypal_email, updated_at';
const METHODS = ['bank', 'airtm', 'paypal'];

// GET /api/verify/identity  -> current verification (or null) + billing details (or null)
router.get('/identity', async (req, res, next) => {
  try {
    const [verification, billing] = await Promise.all([
      pool.query(`SELECT ${FIELDS} FROM verifications WHERE user_id = $1`, [req.user.id]),
      pool.query(`SELECT ${BILLING_FIELDS} FROM billing_details WHERE user_id = $1`, [req.user.id]),
    ]);
    return res.json({ verification: verification.rows[0] || null, billing: billing.rows[0] || null });
  } catch (err) {
    return next(err);
  }
});

// POST /api/verify/identity  -> upload driver's license OR passport (multipart: file + doc_type)
router.post('/identity', upload.single('file'), async (req, res, next) => {
  try {
    const docType = req.body?.doc_type;
    if (!DOC_TYPES[docType]) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ } }
      return res.status(400).json({
        message: 'doc_type must be "drivers_license" (US resident) or "passport" (international)',
      });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded (field name: file)' });
    }

    const existing = (await pool.query(
      'SELECT id, stored_name FROM verifications WHERE user_id = $1',
      [req.user.id]
    )).rows[0];

    const { rows } = await pool.query(
      `INSERT INTO verifications
         (user_id, doc_type, file_name, stored_name, file_path, mime_type, size_bytes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         doc_type = EXCLUDED.doc_type,
         file_name = EXCLUDED.file_name,
         stored_name = EXCLUDED.stored_name,
         file_path = EXCLUDED.file_path,
         mime_type = EXCLUDED.mime_type,
         size_bytes = EXCLUDED.size_bytes,
         status = 'pending',
         review_note = NULL,
         reviewed_by = NULL,
         reviewed_at = NULL,
         created_at = NOW()
       RETURNING ${FIELDS}`,
      [
        req.user.id,
        docType,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size,
      ]
    );

    if (existing?.stored_name && existing.stored_name !== req.file.filename) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, existing.stored_name)); } catch (_) { /* ignore */ }
    }

    return res.status(201).json({ verification: rows[0] });
  } catch (err) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ } }
    return next(err);
  }
});

const sendErr = (res, message, status = 400) => res.status(status).json({ message });

// PUT /api/verify/billing  -> save the billing address + payout method form
router.put('/billing', async (req, res, next) => {
  try {
    const b = req.body || {};
    const method = b.method;
    if (!METHODS.includes(method)) {
      return sendErr(res, 'billing method must be one of: bank, airtm, paypal');
    }

    const required = { full_name: b.full_name, address: b.address, city: b.city, zip: b.zip, country: b.country };
    for (const [key, val] of Object.entries(required)) {
      if (!val || !String(val).trim()) return sendErr(res, `${key.replace('_', ' ')} is required`);
    }

    const methodField =
      method === 'bank'
        ? { ok: Boolean(b.bank_name && b.account_holder && b.account_number && b.routing_number), msg: 'bank name, account holder, account number and routing number are required' }
        : method === 'airtm'
          ? { ok: Boolean(b.airtm_handle), msg: 'AirTM email or username is required' }
          : { ok: Boolean(b.paypal_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.paypal_email)), msg: 'a valid PayPal email is required' };
    if (!methodField.ok) return sendErr(res, methodField.msg);

    const { rows } = await pool.query(
      `INSERT INTO billing_details
         (user_id, method, full_name, address, city, state, zip, country,
          bank_name, account_holder, account_number, routing_number, airtm_handle, paypal_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (user_id) DO UPDATE SET
         method = EXCLUDED.method,
         full_name = EXCLUDED.full_name,
         address = EXCLUDED.address,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         zip = EXCLUDED.zip,
         country = EXCLUDED.country,
         bank_name = EXCLUDED.bank_name,
         account_holder = EXCLUDED.account_holder,
         account_number = EXCLUDED.account_number,
         routing_number = EXCLUDED.routing_number,
         airtm_handle = EXCLUDED.airtm_handle,
         paypal_email = EXCLUDED.paypal_email,
         updated_at = NOW()
       RETURNING ${BILLING_FIELDS}`,
      [
        req.user.id, method, String(b.full_name).trim(), String(b.address).trim(),
        String(b.city).trim(), b.state ? String(b.state).trim() : null, String(b.zip).trim(),
        String(b.country).trim(),
        method === 'bank' ? String(b.bank_name).trim() : null,
        method === 'bank' ? String(b.account_holder).trim() : null,
        method === 'bank' ? String(b.account_number).trim() : null,
        method === 'bank' ? String(b.routing_number).trim() : null,
        method === 'airtm' ? String(b.airtm_handle).trim() : null,
        method === 'paypal' ? String(b.paypal_email).trim() : null,
      ]
    );
    return res.json({ billing: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/verify/identity  -> remove your verification
router.delete('/identity', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM verifications WHERE user_id = $1 RETURNING stored_name',
      [req.user.id]
    );
    if (rows[0]?.stored_name) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, rows[0].stored_name)); } catch (_) { /* ignore */ }
    }
    return res.json({ removed: Boolean(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;