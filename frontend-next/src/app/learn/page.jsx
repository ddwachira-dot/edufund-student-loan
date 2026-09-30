'use client';

import Link from 'next/link';

const guides = [
  {
    to: '/learn/what-you-need',
    title: 'What you need before you apply',
    desc: 'A checklist of documents and details to gather first, so your application takes minutes.',
  },
  {
    to: '/learn/how-it-works',
    title: 'How the process works',
    desc: 'Follow the path from creating your account to receiving your funds, one step at a time.',
  },
  {
    to: '/learn/status',
    title: 'Understanding your application status',
    desc: 'What each status means, what happens next, and where to check for updates.',
  },
  {
    to: '/learn/glossary',
    title: 'Borrower glossary',
    desc: 'Plain-English definitions of loan terms you will come across.',
  },
  {
    to: '/learn/faq',
    title: 'Frequently asked questions',
    desc: 'Quick answers — eligibility, fees, repayment, payouts, and more.',
  },
];

export default function LearnHub() {
  return (
    <div className="container">
      <h1 className="page-title">Learn how student funding works</h1>
      <p className="page-sub">
        Prepare, apply, track, and understand your loan — so nothing surprises you.
      </p>

      {guides.map((g) => (
        <div key={g.to} className="card mb learn-card">
          <Link href={g.to} className="learn-card-link">
            <span>
              <strong style={{ fontSize: 16 }}>{g.title}</strong>
              <br />
              <small className="muted">{g.desc}</small>
            </span>
            <span className="badge progressive" style={{ marginLeft: 'auto' }}>→</span>
          </Link>
        </div>
      ))}

      <div className="card center" style={{ textAlign: 'center' }}>
        <h2 className="about-h2">Ready to apply?</h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          Gather the checklist items and start your loan application.
        </p>
        <Link href="/apply" className="btn">Apply for a loan</Link>
      </div>
    </div>
  );
}