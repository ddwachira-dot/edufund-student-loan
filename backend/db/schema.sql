-- =============================================================
-- Student Loan Portal — PostgreSQL Schema
-- Run via: npm run db:reset   (see backend/db/reset.js)
-- =============================================================

-- Users (students + admins)
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'admin')),
  phone         VARCHAR(30),
  address       TEXT,
  profile_pic   TEXT,
  accepted_terms_at TIMESTAMPTZ,
  welcome_seen_at   TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  closed_reason     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin-managed interest rates (snapshot the rate on the loan at approval time)
CREATE TABLE interest_rates (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(120) NOT NULL,
  rate       NUMERIC(6,3) NOT NULL,              -- annual %, e.g. 8.500
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Loan applications (created by students after $10 fee)
CREATE TABLE loan_applications (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name           VARCHAR(120) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  university          VARCHAR(255) NOT NULL,
  course              VARCHAR(255) NOT NULL,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  duration_months     INTEGER NOT NULL CHECK (duration_months BETWEEN 1 AND 120),
  monthly_income      NUMERIC(12,2),
  purpose             TEXT,
  questionnaire       JSONB NOT NULL DEFAULT '{}',
  application_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('draft','pending','approved','rejected','active','closed')),
  interest_rate       NUMERIC(6,3),               -- snapshot set on approval
  approved_by         INTEGER REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  decision_note       TEXT,                        -- admin note on approve/reject
  disbursement_method VARCHAR(20)
                      CHECK (disbursement_method IN ('bank', 'airtm', 'paypal')),
  disbursement_account TEXT,                       -- bank account / AirTM tag / PayPal email
  disbursed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMI schedule generated on approval
CREATE TABLE emi_schedules (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL,
  due_date       DATE NOT NULL,
  principal      NUMERIC(12,2) NOT NULL,
  interest       NUMERIC(12,2) NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  paid_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at        TIMESTAMPTZ,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','partial','paid')),
  UNIQUE (application_id, installment_no)
);

-- Payments ($10 application fee + EMI payments), recorded in the database
CREATE TABLE payments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES loan_applications(id) ON DELETE SET NULL,
  payment_type   VARCHAR(30) NOT NULL
                 CHECK (payment_type IN ('application_fee','emi','other')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method         VARCHAR(30) NOT NULL DEFAULT 'card',
  reference      VARCHAR(120) NOT NULL UNIQUE,
  status         VARCHAR(20) NOT NULL DEFAULT 'succeeded'
                 CHECK (status IN ('pending','succeeded','failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uploaded documents (ID proofs, transcript, loan agreement, etc.)
CREATE TABLE documents (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name      VARCHAR(255) NOT NULL,   -- original client name
  stored_name    VARCHAR(255) NOT NULL,   -- name on disk
  file_path      TEXT NOT NULL,           -- absolute path
  mime_type      VARCHAR(120),
  size_bytes     BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identity verification (US driver's license or international passport;
-- uploaded by the student, approved/rejected by an admin)
CREATE TABLE verifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  doc_type    VARCHAR(20) NOT NULL
              CHECK (doc_type IN ('drivers_license', 'passport')),
  file_name   VARCHAR(255) NOT NULL,   -- original client name
  stored_name VARCHAR(255) NOT NULL,   -- name on disk
  file_path   TEXT NOT NULL,           -- absolute path
  mime_type   VARCHAR(120),
  size_bytes  BIGINT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing / payout details captured during identity verification.
-- The student picks a payout method and fills its billing info:
--   bank   -> bank_name, account_holder, account_number, routing_number
--   airtm  -> airtm_handle (email or username)
--   paypal -> paypal_email
CREATE TABLE billing_details (
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  method         VARCHAR(20) NOT NULL
                 CHECK (method IN ('bank', 'airtm', 'paypal')),
  full_name      VARCHAR(120) NOT NULL,
  address        TEXT NOT NULL,
  city           VARCHAR(120) NOT NULL,
  state          VARCHAR(120),
  zip            VARCHAR(20) NOT NULL,
  country        VARCHAR(120) NOT NULL,
  bank_name      VARCHAR(120),
  account_holder VARCHAR(120),
  account_number TEXT,
  routing_number TEXT,
  airtm_handle   TEXT,
  paypal_email   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emails blocked from registering or logging in. Login checks this before
-- issuing a token, so a ban holds even if the account row is deleted.
CREATE TABLE banned_emails (
  email          VARCHAR(255) PRIMARY KEY,
  reason         TEXT,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  application_id INTEGER REFERENCES loan_applications(id) ON DELETE SET NULL,
  banned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at    TIMESTAMPTZ,
  released_by    INTEGER REFERENCES users(id)
);

-- Convenience indexes
CREATE INDEX idx_loans_user      ON loan_applications(user_id);
CREATE INDEX idx_loans_status    ON loan_applications(status);
CREATE INDEX idx_emi_application ON emi_schedules(application_id);
CREATE INDEX idx_payments_user   ON payments(user_id);
CREATE INDEX idx_docs_application ON documents(application_id);
CREATE INDEX idx_verifications_user ON verifications(user_id);