'use client';

import Link from 'next/link';

const terms = [
  { term: 'Application fee', def: 'A $10 charge paid at submission and recorded as the first payment on your account.' },
  { term: 'Approved / Active', def: 'The application has been reviewed and our fixed 8.5% interest rate is applied. Active loans show a full EMI schedule and enable payout selection.' },
  { term: 'Co-signer', def: 'A person who supports your application and shares responsibility for the loan.' },
  { term: 'Disbursement', def: 'The transfer of your approved funds to you — via bank, verified AirTM, or verified PayPal account.' },
  { term: 'EMI', def: 'Equated Monthly Instalment — a fixed monthly payment that pays down both principal and interest over the loan term.' },
  { term: 'Interest rate', def: 'The annual percentage you are charged on the outstanding balance. It is snapshotted on your loan at approval.' },
  { term: 'Principal', def: 'The original amount you borrowed, before interest.' },
  { term: 'Pending', def: 'The application has been submitted and is waiting for admin review.' },
  { term: 'Questionnaire', def: 'A short set of questions (employment, co-signer, credit history, scholarships) used during review.' },
  { term: 'Verified account', def: 'A bank, AirTM wallet, or PayPal account whose ownership has been confirmed before we pay out.' },
];

export default function Glossary() {
  return (
    <div className="container">
      <h1 className="page-title">Borrower glossary</h1>
      <p className="page-sub">Plain-English definitions of terms used across FundEd.</p>

      <div className="card">
        {terms.map((t) => (
          <div key={t.term} className="gloss-row">
            <strong>{t.term}</strong>
            <span className="muted">{t.def}</span>
          </div>
        ))}
      </div>

      <div className="mt">
        <Link href="/learn" className="btn outline">← Back to Learn</Link>
      </div>
    </div>
  );
}