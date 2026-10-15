const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { auth } = require('../config/firebase');
const { authenticate, signToken } = require('../middleware/auth');
const { uploadImage, UPLOAD_DIR } = require('../middleware/upload');
const { getClientIp, lookupIp } = require('../utils/geo');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Accepts US/NANP numbers only: 10 digits (area code + exchange starting 2-9),
// optionally preceded by a leading "1".
function isUsPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    digits = digits.slice(1);
  }
  return digits.length === 10 && /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits);
}

const USER_FIELDS = 'id, email, firebase_uid, name, role, phone, address, profile_pic, accepted_terms_at, welcome_seen_at, last_ip, country, country_code, city, created_at';

// Returns the active ban row for an email, or null.
async function findActiveBan(email) {
  const { rows } = await pool.query(
    'SELECT email, reason, banned_at FROM banned_emails WHERE email = $1 AND released_at IS NULL',
    [String(email).toLowerCase()]
  );
  return rows[0] || null;
}

// POST /api/auth/firebase-register -> sync/create student profile from Firebase Auth
router.post('/firebase-register', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ message: 'Firebase authentication token is required' });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid Firebase authentication token' });
    }

    const { name, phone, address, accepted_terms } = req.body || {};
    const email = (decoded.email || req.body?.email || '').toLowerCase();
    const displayName = (name || decoded.name || email.split('@')[0] || '').trim();

    if (!displayName) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (accepted_terms !== true) {
      return res.status(400).json({ message: 'You must accept the Terms & Conditions to register' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Email address is required from Firebase account' });
    }
    if (phone && !isUsPhone(phone)) {
      return res.status(400).json({ message: 'A valid US phone number is required' });
    }
    if (await findActiveBan(email)) {
      return res.status(403).json({ message: 'This email address has been blocked from registering' });
    }

    const clientIp = getClientIp(req);
    const geo = await lookupIp(clientIp);

    // Check if user exists by firebase_uid or email
    const { rows: existingRows } = await pool.query(
      'SELECT id, role, firebase_uid, closed_at, closed_reason FROM users WHERE firebase_uid = $1 OR email = $2 LIMIT 1',
      [decoded.uid, email]
    );

    let userId;
    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.closed_at) {
        return res.status(403).json({ message: `This account has been closed. Reason: ${existing.closed_reason || 'no reason recorded'}` });
      }
      await pool.query(
        `UPDATE users
            SET firebase_uid = $1,
                name = COALESCE($2, name),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address),
                accepted_terms_at = COALESCE(accepted_terms_at, NOW()),
                last_ip = COALESCE($5, last_ip),
                country = COALESCE($6, country),
                country_code = COALESCE($7, country_code),
                city = COALESCE($8, city)
          WHERE id = $9`,
        [decoded.uid, displayName, phone || null, address || null, clientIp, geo?.country, geo?.countryCode, geo?.city, existing.id]
      );
      userId = existing.id;
    } else {
      const { rows: inserted } = await pool.query(
        `INSERT INTO users (email, firebase_uid, name, role, phone, address, accepted_terms_at, last_ip, country, country_code, city)
         VALUES ($1, $2, $3, 'student', $4, $5, NOW(), $6, $7, $8, $9)
         RETURNING id`,
        [email, decoded.uid, displayName, phone || null, address || null, clientIp, geo?.country, geo?.countryCode, geo?.city]
      );
      userId = inserted[0].id;
    }

    const { rows: full } = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [userId]
    );
    return res.status(201).json({ token: idToken, user: full[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    return next(err);
  }
});

// POST /api/auth/firebase-login -> sync profile & verify account after Firebase sign-in
router.post('/firebase-login', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ message: 'Firebase authentication token is required' });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }

    const email = (decoded.email || '').toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Firebase account has no verified email address' });
    }

    const ban = await findActiveBan(email);
    if (ban) {
      return res.status(403).json({
        message: `This account has been closed. Reason: ${ban.reason || 'no reason recorded'}`,
      });
    }

    let { rows } = await pool.query(
      `SELECT ${USER_FIELDS}, closed_at, closed_reason
         FROM users
        WHERE firebase_uid = $1 OR email = $2
        ORDER BY (firebase_uid = $1) DESC
        LIMIT 1`,
      [decoded.uid, email]
    );

    let user = rows[0];
    const clientIp = getClientIp(req);

    // If user doesn't exist in Postgres yet (e.g. direct Firebase sign-in), create default student record
    if (!user) {
      const geo = await lookupIp(clientIp);
      const displayName = (decoded.name || email.split('@')[0] || 'Student').trim();
      const { rows: created } = await pool.query(
        `INSERT INTO users (email, firebase_uid, name, role, accepted_terms_at, last_ip, country, country_code, city)
         VALUES ($1, $2, $3, 'student', NOW(), $4, $5, $6, $7)
         RETURNING ${USER_FIELDS}`,
        [email, decoded.uid, displayName, clientIp, geo?.country, geo?.countryCode, geo?.city]
      );
      user = created[0];
    } else {
      if (user.closed_at) {
        return res.status(403).json({
          message: `This account has been closed. Reason: ${user.closed_reason || 'no reason recorded'}`,
        });
      }
      // Async update IP and location on login
      if (clientIp && clientIp !== user.last_ip) {
        lookupIp(clientIp).then((geo) => {
          pool.query(
            `UPDATE users
                SET last_ip = $1, country = COALESCE($2, country), country_code = COALESCE($3, country_code), city = COALESCE($4, city)
              WHERE id = $5`,
            [clientIp, geo?.country, geo?.countryCode, geo?.city, user.id]
          ).catch(() => {});
        }).catch(() => {});
      }
      if (!user.firebase_uid) {
        await pool.query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [decoded.uid, user.id]);
        user.firebase_uid = decoded.uid;
      }
    }

    const safe = {
      id: user.id,
      email: user.email,
      firebase_uid: user.firebase_uid,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      profile_pic: user.profile_pic,
      accepted_terms_at: user.accepted_terms_at,
      welcome_seen_at: user.welcome_seen_at,
      created_at: user.created_at,
    };

    return res.json({ token: idToken, user: safe });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/register  -> legacy student registration
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, address, accepted_terms } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (accepted_terms !== true) {
      return res.status(400).json({ message: 'You must accept the Terms & Conditions to register' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!isUsPhone(phone)) {
      return res.status(400).json({ message: 'A valid US phone number is required' });
    }
    if (!PASSWORD_RE.test(String(password))) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character',
      });
    }
    if (await findActiveBan(email)) {
      return res.status(403).json({ message: 'This email address has been blocked from registering' });
    }
    const password_hash = await bcrypt.hash(String(password), 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, phone, address, accepted_terms_at)
       VALUES ($1, $2, $3, 'student', $4, $5, NOW())
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), password_hash, name, phone || null, address || null]
    );
    const user = rows[0];
    const { rows: full } = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [user.id]
    );
    return res.status(201).json({ token: signToken(full[0]), user: full[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    return next(err);
  }
});

// POST /api/auth/login -> legacy login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    const user = rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const ban = await findActiveBan(email);
    if (ban) {
      return res.status(403).json({
        message: `This account has been closed. Reason: ${ban.reason || 'no reason recorded'}`,
      });
    }
    if (user.closed_at) {
      return res.status(403).json({
        message: `This account has been closed. Reason: ${user.closed_reason || 'no reason recorded'}`,
      });
    }
    const safe = {
      id: user.id, email: user.email, firebase_uid: user.firebase_uid, name: user.name, role: user.role,
      phone: user.phone, address: user.address, profile_pic: user.profile_pic,
      accepted_terms_at: user.accepted_terms_at, welcome_seen_at: user.welcome_seen_at,
      created_at: user.created_at,
    };
    return res.json({ token: signToken(safe), user: safe });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/profile-picture  -> upload user's profile photo (field: file)
router.post('/profile-picture', authenticate, uploadImage.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded (field name: file)' });
    }
    const current = (await pool.query('SELECT profile_pic FROM users WHERE id = $1', [req.user.id]))
      .rows[0];
    const { rows } = await pool.query(
      `UPDATE users SET profile_pic = $2 WHERE id = $1
       RETURNING ${USER_FIELDS}`,
      [req.user.id, req.file.filename]
    );
    if (current?.profile_pic) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, current.profile_pic)); } catch (_) { /* ignore */ }
    }
    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ } }
    return next(err);
  }
});

// POST /api/auth/welcome-seen  -> mark the one-time welcome page as seen
router.post('/welcome-seen', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET welcome_seen_at = COALESCE(welcome_seen_at, NOW())
       WHERE id = $1 RETURNING ${USER_FIELDS}`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/auth/profile  -> update name / phone / address
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, address } = req.body || {};
    const updates = {};
    if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (address !== undefined) updates.address = address ? String(address).trim() : null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update (name, phone or address)' });
    }
    const keys = Object.keys(updates);
    const setSql = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE users SET ${setSql} WHERE id = $${keys.length + 1} RETURNING ${USER_FIELDS}`,
      [...Object.values(updates), req.user.id]
    );
    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;