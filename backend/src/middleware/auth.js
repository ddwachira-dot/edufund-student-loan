const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { auth } = require('../config/firebase');

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

  // 1. Try Firebase Auth ID token verification
  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded && decoded.uid) {
      const email = (decoded.email || '').toLowerCase();
      const { rows } = await pool.query(
        `SELECT id, email, name, role, firebase_uid, closed_at, closed_reason
           FROM users
          WHERE firebase_uid = $1 OR (email = $2 AND $2 <> '')
          ORDER BY (firebase_uid = $1) DESC
          LIMIT 1`,
        [decoded.uid, email]
      );

      const dbUser = rows[0];
      if (!dbUser) {
        return res.status(401).json({ message: 'User account not found in database. Please complete registration.' });
      }

      // Link firebase_uid if not already linked
      if (!dbUser.firebase_uid) {
        await pool.query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [decoded.uid, dbUser.id]);
        dbUser.firebase_uid = decoded.uid;
      }

      const state = await accountBlocked(dbUser.id);
      if (state.blocked) {
        return res.status(403).json({ message: `This account has been closed. Reason: ${state.reason}` });
      }

      req.user = {
        id: dbUser.id,
        uid: decoded.uid,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      };
      return next();
    }
  } catch (firebaseErr) {
    // If not a Firebase token, try legacy JWT verification below
  }

  // 2. Legacy fallback to HMAC JWT token (supports existing session tokens & admin CLI)
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const state = await accountBlocked(claims.id);
    if (state.blocked) {
      return res.status(403).json({ message: `This account has been closed. Reason: ${state.reason}` });
    }
    req.user = claims;
    return next();
  } catch (jwtErr) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin, signToken, JWT_SECRET };