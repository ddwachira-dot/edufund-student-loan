'use client';

import Link from 'next/link';

const steps = [
  {
    step: '1',
    author: 'You',
    title: 'Create your account',
    body: 'Register with your name, email and password. You agree to the Terms & Conditions, and we store your password securely hashed — so you only register once and sign in afterwards.',
  },
  {
    step: '2',
    author: 'You',
    title: 'Tell us about yourself',
    body: 'Start with your identity, then your university, course, loan amount, term, and monthly income. Each section saves as you go, so you can come back to finish.',
  },
  {
    step: '3',
    author: 'You',
    title: 'Questionnaire',
    body: 'A short set of questions — employment status, co-signer availability, credit history, scholarships — to size up your situation.',
  },
  {
    step: '4',
    author: 'You',
    title: 'Submit and upload documents',
    body: 'Pay the $10 application fee and upload any supporting documents. You get a confirmation and your loan appears in "My Loans".',
  },
  {
    step: '5',
    author: 'Admin',
    title: 'Review and approval',
    body: 'An administrator reviews your application and, if approved, applies our fixed 8.5% interest rate. Your EMI schedule is generated automatically and shown right away.',
  },
  {
    step: '6',
    author: 'You',
    title: 'Receive your funds',
    body: 'Once approved, choose how you receive the money: bank, verified AirTM, or verified PayPal. Disbursement is tracked on your loan.',
  },
  {
    step: '7',
    author: 'You',
    title: 'Repay on schedule',
    body: 'Follow your EMI instalments and watch your progress. When the final payment clears, the loan closes.',
  },
];

export default function HowItWorks() {
  return (
    <div className="container">
      <h1 className="page-title">How the process works</h1>
      <p className="page-sub">
        Submit, review, track — a clear path from application to repayment.
      </p>

      <div className="card">
        {steps.map((s, i) => (
          <div key={s.step} className="how-step">
            <span className={`step ${i < 1 ? '' : ''}`}>{s.step}</span>
            <div className="how-body">
              <div className="flex" style={{ gap: 8 }}>
                <h3 style={{ margin: 0 }}>{s.title}</h3>
                <span className="badge draft">{s.author}</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 0' }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt" style={{ textAlign: 'center' }}>
        <h2 className="about-h2">Ready to start?</h2>
        <Link href="/apply" className="btn">Apply for a loan</Link>{' '}
        <Link href="/learn/what-you-need" className="btn outline">See the checklist</Link>
      </div>
    </div>
  );
}