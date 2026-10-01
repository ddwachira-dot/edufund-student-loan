# FundEd — Full-Stack Student Loan Portal

A runnable student loan management system:

- **Frontend:** React 18 + Vite, React Router, Axios, Recharts
- **Backend:** Node.js + Express, JWT auth, Multer uploads
- **Database:** PostgreSQL (raw SQL schema, DB starts empty — no seed data)
- **Payments:** Paystack checkout (application fee + EMI instalments)

## Features

### Students
- Register / login (JWT in `localStorage`, bcrypt-hashed passwords)
- **Verify identity** after registering — US driver's license or international passport,
  uploaded then **reviewed/approved by an admin** (skippable at registration, but requires
  approval before applying for a loan)
- Apply for a loan after filling a 4-question **questionnaire**
- Pay a **$10 application fee** at submission
- Upload supporting documents (PDF / JPG / PNG / DOC / DOCX, up to 10 MB)
- Dashboard with **Recharts** charts (payment history, repayment progress)
- View full **EMI schedule** and make EMI payments
- Full payment history

### Admins
- Dashboard with charts (application status pie, monthly revenue bars, disbursement line)
- Review applications, **approve** (pick an active interest rate → EMI schedule auto-generated) or **reject**
- **Review identity documents**: approve/reject uploaded driver's licenses and passports
- **Manage interest rates**: create, edit, activate/deactivate (rate snapshotted on the loan at approval)

### Empty start (no seed data)
`npm run db:reset` recreates the schema **empty** — no demo users, loans, or payments.
Create your first admin with the CLI (or register as a student from the app):

```bash
npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"
```

Re-running that command on an existing email resets its password and promotes it to admin.

## Migrations

`db/schema.sql` is the source of truth for a fresh database. To add the later columns and
tables to a database you already have, use the additive migration — it never drops anything:

```bash
npm run db:migrate
```

## Automated decision runner (simulation)

`backend/src/services/simulation.js` optionally clears the review queues on a timer so the
admin dashboard keeps moving without a human clicking through it. Each cycle:

- approves up to **7** pending identity verifications
- rejects up to **3** pending applications, then **closes that borrower's account and bans
  their email** so they can no longer log in or re-register

**It is off unless `SIMULATION_ENABLED=true`.** It approves ID documents and bans real
borrowers with no human in the loop, so never point it at a database with real applicants.
It only acts on rows that already exist — it never manufactures users or applications.

```bash
SIMULATION_ENABLED=true \
SIMULATION_INTERVAL_MS=300000 \
SIMULATION_APPROVE_VERIFICATIONS=7 \
SIMULATION_REJECT_APPLICATIONS=3 \
npm start
```

Every run is logged to stdout. Bans are reversible:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/banned/<email>/release
```

## Folder structure

```
student-loan/
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── db/
│   │   ├── schema.sql          # full PostgreSQL schema
│   │   ├── reset.js            # DROP + recreate empty schema (npm run db:reset)
│   │   └── create-admin.js     # create the first admin user (npm run db:create-admin)
│   ├── uploads/                # Multer file storage (git-ignored)
│   └── src/
│       ├── index.js            # server bootstrap
│       ├── app.js              # express wiring, guarded /api/avatars + /api/docs, error handler
│       ├── config/db.js        # pg Pool
│       ├── middleware/
│       │   ├── auth.js         # JWT sign/verify + admin guard
│       │   └── upload.js       # Multer config
│       ├── routes/
│       │   ├── auth.routes.js  # register / login / me
│   │       ├── loan.routes.js  # apply (identity-gated), list, detail, documents
│   │       ├── payment.routes.js # history + pay EMI
│   │       ├── admin.routes.js # review, approve/reject, stats, rates
│   │       └── verify.routes.js # identity verification (drivers_license / passport)
│       └── utils/
│           └── emi.js          # reducing-balance EMI schedule generator
└── frontend/
    ├── package.json
    ├── vite.config.js          # proxies /api -> :5000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx             # routes + role-based dashboard switch
        ├── index.css           # design system (cards, badges, buttons)
        ├── api/client.js       # axios instance with JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Welcome.jsx             # impact page before dashboard (each student login)
            ├── Verify.jsx               # identity verification (license/passport)
            ├── Login.jsx
            ├── Register.jsx
            ├── About.jsx               # project aim / mission page
            ├── TermsOfService.jsx
            ├── PrivacyPolicy.jsx
            ├── Profile.jsx             # account + profile picture upload
            └── learn/                   # learner content guides
                ├── LearnHub.jsx
                ├── WhatYouNeed.jsx     # pre-application checklist
                ├── HowItWorks.jsx      # step-by-step process
                ├── StatusGuide.jsx     # application status meanings
                ├── Glossary.jsx        # borrower glossary
                └── Faq.jsx             # frequently asked questions
            ├── StudentDashboard.jsx
            ├── ApplyLoan.jsx      # 3-step: details → questionnaire → fee+docs
            ├── MyLoans.jsx
            ├── LoanDetail.jsx     # EMI table + pay + documents + history
            ├── Payments.jsx
            └── admin/
                ├── AdminDashboard.jsx
                ├── AdminApplications.jsx
                ├── AdminVerifications.jsx
                └── AdminRates.jsx
```

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally
- (optional) Git

## Setup

### 1. Database

Create the database (one time):

```bash
psql -U postgres -h localhost -c "CREATE DATABASE student_loan;"
```

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env    # edit DATABASE_URL + JWT_SECRET for your machine
npm run db:reset          # drops + recreates the schema (starts empty)
npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"
npm run dev               # http://localhost:5000
```

On Git Bash / WSL use `cp .env.example .env`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173.

## First admin account

The database starts empty. Create your admin account once, after `npm run db:reset`:

```bash
cd backend
npm run db:create-admin              # interactive prompts, or pass flags:
npm run db:create-admin -- --email you@example.com --password YourPass --name "Your Name"
```

Students register from the app at `/register`.

## API overview

| Method | Endpoint                              | Auth          | Description                          |
|--------|---------------------------------------|---------------|--------------------------------------|
| POST   | /api/auth/register                    | —             | Create student account (blocked if the email is banned) |
| POST   | /api/auth/login                       | —             | Get JWT (403 if the account is closed/banned) |
| GET    | /api/auth/me                          | Bearer        | Current user                         |
| PATCH  | /api/auth/profile                     | Bearer        | Update name / phone / address        |
| POST   | /api/auth/profile-picture             | Bearer        | Upload profile photo (multipart `file`, 5 MB image) |
| POST   | /api/auth/welcome-seen               | Bearer        | Mark one-time welcome page as seen   |
| POST   | /api/loans                            | Student       | Apply (requires an approved identity document) |
| GET    | /api/loans                            | Student       | My applications                      |
| GET    | /api/loans/:id                        | Student/Admin | Detail + EMIs + docs + payments      |
| POST   | /api/loans/:id/documents              | Student/Admin | Upload document (multipart `file`)   |
| POST   | /api/loans/:id/disbursement           | Student       | Choose payout method (bank, airtm, paypal) |
| DELETE | /api/loans/documents/:docId           | Student/Admin | Remove document                      |
| GET    | /api/docs/:stored_name?token=…        | Owner/Admin   | Download a loan or identity document |
| GET    | /api/avatars/:stored_name?token=…     | Owner         | Download own profile picture (image types only) |
| GET    | /api/rates                            | —             | Fixed 8.5% p.a. rate + $3,000 cap (EMI estimator) |
| GET    | /api/verify/identity                 | Student       | Current identity verification + billing (or null) |
| POST   | /api/verify/identity                 | Student       | Upload driver's license or passport (multipart `file` + `doc_type`) → pending |
| DELETE | /api/verify/identity                 | Student       | Remove verification                         |
| PUT    | /api/verify/billing                  | Student       | Save payout method + billing address           |
| GET    | /api/payments                         | Student       | My payments                          |
| POST   | /api/payments/initialize              | Student       | Open a Paystack checkout (`purpose`: `emi` \| `application_fee`) |
| POST   | /api/payments/confirm                 | Student       | Verify the Paystack payment and apply it      |
| GET    | /api/admin/applications?status=       | Admin         | List applications                    |
| GET    | /api/admin/applications/:id           | Admin         | Full review detail                   |
| PATCH  | /api/admin/applications/:id/approve   | Admin         | Approve + generate EMI schedule      |
| PATCH  | /api/admin/applications/:id/reject    | Admin         | Reject (`{ reason, close_account }`) |
| GET    | /api/admin/stats                      | Admin         | Dashboard numbers + chart series     |
| GET    | /api/admin/verifications?status=     | Admin         | List identity documents                     |
| PATCH  | /api/admin/verifications/:id/approve | Admin         | Approve document (unlocks loan applications) |
| PATCH  | /api/admin/verifications/:id/reject  | Admin         | Reject document with optional reason        |
| GET    | /api/admin/rates                      | Admin         | Read-only: the fixed 8.5% p.a. rate   |
| GET    | /api/admin/banned                     | Admin         | List active email bans               |
| POST   | /api/admin/banned/:email/release      | Admin         | Lift a ban and reopen the account    |

Approve takes no body: the rate is fixed at 8.5% p.a. for every loan, so it is snapshotted
onto the application and the schedule is generated with the reducing-balance formula
`EMI = P·r(1+r)ⁿ/((1+r)ⁿ−1)`.

Paying: `POST /api/payments/initialize` with `{ application_id, purpose, amount? }` returns a
Paystack `authorization_url`; the browser is redirected there and the app then calls
`POST /api/payments/confirm` with the reference. The amount actually applied is read back from
Paystack, applied to the earliest unpaid instalment; the loan flips to `closed` when fully repaid.

Disbursement body: `{ "method": "bank" | "airtm" | "paypal", "account": "<details>" }` — only available after approval; the method and account are stored on the loan at `disbursed_at`.

Verification: upload multipart `file` + `doc_type` (`drivers_license` for US residents, `passport` for international students). Uploads land in `pending`; an admin approves/rejects them on `/api/admin/verifications`. Re-uploading replaces the document and resets to `pending`; `POST /api/loans` returns `403` until the document is `approved`.

## Notes

- Passwords are hashed with bcryptjs. JWT expires in 7 days.
- Uploads are **never** served as a static directory. Every read goes through
  `/api/docs/:stored_name` or `/api/avatars/:stored_name`, which resolve the filename against
  the database and then check ownership. Both accept `?token=` because `<img>`/`<iframe>`
  cannot send an `Authorization` header.
- A closed account or banned email is rejected on **every** authenticated request, not only at
  login, so a token minted before the closure stops working immediately.
- Payments (the $10 application fee and EMI instalments) go through Paystack and are recorded in
  the `payments` table with the `PS_...` reference Paystack returns. There is no webhook — the
  browser returning from checkout is what confirms a payment, so an abandoned checkout leaves the
  application unpaid.
- `npm run db:reset` is **destructive** — it drops and recreates the `public` schema. Never run it
  against production data. Use `npm run db:migrate` for additive changes.
- Uploaded files land in `backend/uploads/` (git-ignored). Change the directory in `src/middleware/upload.js` if desired.

## Production-ish tips

- Serve the built frontend (`frontend/dist`) from Express, or host separately.
- Terminate TLS at a reverse proxy and use a real JWT secret from env.
- If you integrate a real payment processor later, keep its transactions/refunds in the `payments` table and store card or mandate data offsite.
- Add row-level policies / rate-limiting if exposing publicly.