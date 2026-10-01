const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// A closed account or banned email is rejected on every authenticated request, not
// just at login, so a token minted before the closure stops working immediately.
// One primary-key lookup on users + one on banned_emails.email.
async function accountBlocked(userId) {
  const { rows } = await pool.query(
    `SELECT u.closed_at, u.closed_reason,
            (b.email IS NOT NULL) AS is_banned,
            COALESCE(u.closed_reason, b.reason) AS reason
       FROM users u
       LEFT JOIN banned_emails b ON b.email = u.email AND b.released_at IS NULL
      WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return { blocked: true, reason: 'Account no longer exists' };
  if (row.closed_at || row.is_banned) {
    return { blocked: true, reason: row.reason || 'no reason recorded' };
  }
  return { blocked: false };
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  try {
    const state = await accountBlocked(claims.id);
    if (state.blocked) {
      return res.status(403).json({ message: `This account has been closed. Reason: ${state.reason}` });
    }
  } catch (err) {
    return next(err);
  }
  req.user = claims;
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin, signToken, JWT_SECRET };