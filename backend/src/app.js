require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./config/db');
const { UPLOAD_DIR } = require('./middleware/upload');
const authRoutes = require('./routes/auth.routes');
const loanRoutes = require('./routes/loan.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const verifyRoutes = require('./routes/verify.routes');
const { authenticate } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploads are NEVER served as a static directory — every read goes through an
// ownership-checked endpoint (/api/avatars/:name, /api/docs/:name) below.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);        // auth enforced inside
app.use('/api/payments', paymentRoutes);  // auth enforced inside
app.use('/api/admin', adminRoutes);       // admin enforced inside
app.use('/api/verify', verifyRoutes);     // auth enforced inside

// Public: the interest rate is fixed at 8.5% p.a. for every loan
app.get('/api/rates', (req, res) => {
  const { INTEREST_RATE, MAX_LOAN_AMOUNT } = require('./config/loan');
  return res.json({
    rate: { id: null, label: 'Standard Fixed Rate', rate: INTEREST_RATE },
    max_amount: MAX_LOAN_AMOUNT,
  });
});

// Stored files are reached from <img>/<iframe>/<a> tags, which cannot send an
// Authorization header — so these two endpoints also accept ?token= (see
// middleware/auth.js) and then enforce ownership before reading from disk.
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// users.profile_pic stores only a filename, so map the extension back to a type.
const EXT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function avatarType(storedName) {
  return EXT_TYPES[path.extname(storedName).toLowerCase()] || null;
}

// Only mime types the Multer allow-lists on upload are ever echoed back, so no
// HTML/SVG can be rendered inline. `nosniff` stops browsers sniffing anything else.
function sendStoredFile(res, storedName, mimeType, allowTypes) {
  const safe = path.basename(storedName);
  const file = path.join(UPLOAD_DIR, safe);
  if (allowTypes && !allowTypes.has(mimeType)) {
    return res.status(415).json({ message: 'File is not an accepted media type' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.sendFile(file, (err) => {
    if (err && !res.headersSent) {
      res.status(err.status || 500).json({ message: 'Could not read file' });
    }
  });
}

function isSelf(userId, req) {
  return String(userId) === String(req.user.id);
}

// GET /api/avatars/:stored_name -> the caller's own profile picture only
app.get('/api/avatars/:stored_name', authenticate, async (req, res, next) => {
  try {
    const safe = path.basename(req.params.stored_name);
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE profile_pic = $1 LIMIT 1', [safe]
    );
    const owner = rows[0];
    if (!owner) return res.status(404).json({ message: 'Image not found' });
    if (!isSelf(owner.id, req)) return res.status(403).json({ message: 'Forbidden' });
    return sendStoredFile(res, safe, avatarType(safe), AVATAR_TYPES);
  } catch (err) {
    return next(err);
  }
});

// GET /api/docs/:stored_name -> loan documents + identity documents, owner or admin only
app.get('/api/docs/:stored_name', authenticate, async (req, res, next) => {
  try {
    const safe = path.basename(req.params.stored_name);
    const { rows } = await pool.query(
      `SELECT user_id, mime_type FROM documents    WHERE stored_name = $1
       UNION ALL
       SELECT user_id, mime_type FROM verifications WHERE stored_name = $1
       LIMIT 1`,
      [safe]
    );
    const record = rows[0];
    if (!record) return res.status(404).json({ message: 'Document not found' });
    if (req.user.role !== 'admin' && !isSelf(record.user_id, req)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return sendStoredFile(res, safe, record.mime_type, null);
  } catch (err) {
    return next(err);
  }
});

// Not-found + error handlers
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err.message);
  const status = err.status || err.statusCode || 500;
  const isClientError = status >= 400 && status < 500;
  res.status(status).json({
    message: isClientError ? err.message : 'Internal server error',
  });
});

module.exports = app;