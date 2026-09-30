'use client';

import Link from 'next/link';

const faqs = [
  {
    q: 'Is applying free?',
    a: 'FundEd charges a $10 application fee at submission.',
  },
  {
    q: 'Am I eligible?',
    a: 'Loans are available only to students enrolled at accredited institutions based in the United States, as stated in our Terms & Conditions.',
  },
  {
    q: 'What do I need before I apply?',
    a: 'Your school and course details, a loan amount and term, an income estimate, and a card for the $10 fee. See the full checklist on the Learn page.',
  },
  {
    q: 'How much will I pay each month?',
    a: 'Use the estimator on the Apply page — it computes an estimated EMI from your amount, term, and our fixed 8.5% annual interest rate.',
  },
  {
    q: 'How do I receive the money after approval?',
    a: 'Choose one of three payout methods on the loan detail page: bank deposit, a verified AirTM wallet, or a verified PayPal account. Funds are only paid to verified accounts.',
  },
  {
    q: 'What happens if I miss a payment?',
    a: 'Payments are applied to the earliest unpaid instalment; the loan stays active until all instalments are paid. Contact support if your situation changes.',
  },
  {
    q: 'Can I cancel or withdraw an application?',
    a: 'A pending application can be left for the admin to review, or rejected by the admin. If approved, the loan repays on schedule and closes automatically when paid off.',
  },
];

export default function Faq() {
  return (
    <div className="container">
      <h1 className="page-title">Frequently asked questions</h1>
      <p className="page-sub">Quick answers to common questions, no call needed.</p>

      <div className="card">
        {faqs.map((f) => (
          <details key={f.q} className="faq-item">
            <summary>{f.q}</summary>
            <p className="muted">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt">
        <Link href="/learn" className="btn outline">← Back to Learn</Link>{' '}
        <Link href="/apply" className="btn">Apply for a loan</Link>
      </div>
    </div>
  );
}