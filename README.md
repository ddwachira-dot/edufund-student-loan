# FundEd — Full-Stack Student Loan Portal

A runnable student loan management system:

- **Frontend:** React 18 + Vite, React Router, Axios, Recharts
- **Backend:** Node.js + Express, JWT auth, Multer uploads
- **Database:** PostgreSQL (raw SQL schema, DB starts empty — no seed data)
- **Payments:** recorded directly in PostgreSQL (no external processor)

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
│       ├── app.js              # express wiring, static /uploads, error handler
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
| POST   | /api/auth/register                    | —             | Create student account               |
| POST   | /api/auth/login                       | —             | Get JWT                              |
| GET    | /api/auth/me                          | Bearer        | Current user                         |
| POST   | /api/auth/welcome-seen               | Bearer        | Mark one-time welcome page as seen   |
| POST   | /api/loans                            | Student       | Apply + charge $10 fee               |
| GET    | /api/loans                            | Student       | My applications                      |
| GET    | /api/loans/:id                        | Student/Admin | Detail + EMIs + docs + payments      |
| POST   | /api/loans/:id/documents              | Student/Admin | Upload document (multipart `file`)   |
| POST   | /api/loans/:id/disbursement           | Student       | Choose payout method (bank, airtm, paypal) |
| DELETE | /api/loans/documents/:docId           | Student/Admin | Remove document                      |
| GET    | /api/docs/:stored_name?token=…        | Bearer/Qtkn   | Download stored document             |
| GET    | /api/rates                            | —             | Current active interest rate (EMI estimator) |
| GET    | /api/verify/identity                 | Student       | Current identity verification (or null)      |
| POST   | /api/verify/identity                 | Student       | Upload driver's license or passport (multipart `file` + `doc_type`) → pending |
| DELETE | /api/verify/identity                 | Student       | Remove verification                         |
| GET    | /api/admin/verifications?status=     | Admin         | List identity documents                     |
| PATCH  | /api/admin/verifications/:id/approve | Admin         | Approve document (unlocks loan applications) |
| PATCH  | /api/admin/verifications/:id/reject  | Admin         | Reject document with optional reason        |
| GET    | /api/payments                         | Student       | My payments                          |
| POST   | /api/payments/emi                     | Student       | Pay an EMI instalment                |
| GET    | /api/admin/applications?status=       | Admin         | List applications                    |
| GET    | /api/admin/applications/:id           | Admin         | Full review detail                   |
| PATCH  | /api/admin/applications/:id/approve   | Admin         | Approve + generate EMI schedule      |
| PATCH  | /api/admin/applications/:id/reject    | Admin         | Reject                               |
| GET    | /api/admin/stats                      | Admin         | Dashboard numbers + chart series     |
| GET    | /api/admin/rates                      | Admin         | List rates                           |
| POST   | /api/admin/rates                      | Admin         | Create rate                          |
| PATCH  | /api/admin/rates/:id                  | Admin         | Update / toggle rate                 |

Approve body: `{ "rate_id": 1 }` — the loan's `interest_rate` is snapshotted and the EMI schedule is generated with the reducing-balance formula `EMI = P·r(1+r)ⁿ/((1+r)ⁿ−1)`.

Pay EMI body: `{ "application_id": 1, "amount": 320.50 }` — applied to the earliest unpaid instalment; loan flips to `closed` when fully repaid.

Disbursement body: `{ "method": "bank" | "airtm" | "paypal", "account": "<details>" }` — only available after approval; the method and (masked) account are stored on the loan at `disbursed_at`.

Verification: upload multipart `file` + `doc_type` (`drivers_license` for US residents, `passport` for international students). Uploads land in `pending`; an admin approves/rejects them on `/api/admin/verifications`. Re-uploading replaces the document and resets to `pending`; `POST /api/loans` returns `403` until the document is `approved`.

## Notes

- Passwords are hashed with bcryptjs. JWT expires in 7 days.
- Payments (the $10 application fee and EMI instalments) are written straight to the `payments` table with a generated `PAY_...` reference — no external processor is involved.
- `npm run db:reset` is **destructive** — it drops and recreates the `public` schema. Never run it against production data.
- Uploaded files land in `backend/uploads/` (git-ignored). Change the directory in `src/middleware/upload.js` if desired.

## Production-ish tips

- Serve the built frontend (`frontend/dist`) from Express, or host separately.
- Terminate TLS at a reverse proxy and use a real JWT secret from env.
- If you integrate a real payment processor later, keep its transactions/refunds in the `payments` table and store card or mandate data offsite.
- Add row-level policies / rate-limiting if exposing publicly.