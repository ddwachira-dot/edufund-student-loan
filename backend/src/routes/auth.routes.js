const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { authenticate, signToken } = require('../middleware/auth');
const { uploadImage, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USER_FIELDS = 'id, email, name, role, phone, address, profile_pic, accepted_terms_at, welcome_seen_at, created_at';

// POST /api/auth/register  -> creates a student account
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
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
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

// POST /api/auth/login
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
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const safe = {
      id: user.id, email: user.email, name: user.name, role: user.role,
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
       RETURNING ${USER_FIELDS.replace(/profile_pic/, 'profile_pic')}`,
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