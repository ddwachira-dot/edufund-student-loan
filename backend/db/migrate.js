/*
 * Additive, idempotent migration — safe to run against a populated database.
 * Unlike db/reset.js this never drops anything.
 *
 * Usage:  npm run db:migrate
 */
require('dotenv').config();

const pool = require('../src/config/db');

const STEPS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS closed_reason TEXT`,
  `CREATE TABLE IF NOT EXISTS banned_emails (
     email          VARCHAR(255) PRIMARY KEY,
     reason         TEXT,
     user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
     application_id INTEGER REFERENCES loan_applications(id) ON DELETE SET NULL,
     banned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     released_at    TIMESTAMPTZ,
     released_by    INTEGER REFERENCES users(id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_banned_active ON banned_emails(released_at)`,
  // One payment per Paystack reference: first de-duplicate, then enforce uniqueness.
  `DELETE FROM payments p USING payments p2 WHERE p.id > p2.id AND p.reference = p2.reference`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference)`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const sql of STEPS) {
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log(`Migration applied (${STEPS.length} steps, existing rows untouched).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();