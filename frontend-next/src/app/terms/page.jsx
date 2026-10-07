'use client';

import Link from 'next/link';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By registering for an FundEd account, you agree to these Terms and Conditions. ' +
      'If you do not agree with any part of these terms, you may not use the service.',
  },
  {
    title: '2. Eligibility',
    body:
      'FundEd loans are available only to students enrolled at accredited institutions based in ' +
      'the United States. You must be at least 18 years old, a current or prospective student at a ' +
      'US institution, and have the legal capacity to enter into a binding agreement. You are ' +
      'responsible for ensuring the information you provide during registration is accurate, ' +
      'current, and complete.',
  },
  {
    title: '3. Accounts and Security',
    body:
      'You are responsible for safeguarding your account credentials and for all activity that ' +
      'occurs under your account. Notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '4. Loan Applications',
    body:
      'Submitting a loan application does not guarantee approval. FundEd reserves the right to ' +
      'review, approve, or reject applications based on its underwriting criteria. An application ' +
      'fee may be charged at the time of submission.',
  },
  {
    title: '5. Interest and Repayment',
    body:
      'Approved loans accrue interest at the rate applicable on the approval date, which is ' +
      'snapshotted to your loan. You agree to repay the loan according to the EMI schedule ' +
      'generated for your loan.',
  },
  {
    title: '6. Payments',
    body:
      'Payments you make through the platform (application fee and EMI instalments) are ' +
      'recorded to your account. You agree to ensure sufficient funds are available and to ' +
      'pay all amounts due by their due date.',
  },
  {
    title: '7. Privacy',
    body:
      'We collect and use your personal information as described in our Privacy Policy to provide ' +
      'and improve the service. We do not sell your personal data to third parties.',
  },
  {
    title: '8. Limitation of Liability',
    body:
      'To the maximum extent permitted by law, FundEd shall not be liable for indirect, ' +
      'incidental, or consequential damages arising from your use of the service.',
  },
  {
    title: '9. Changes to These Terms',
    body:
      'We may update these Terms from time to time. Continued use of the service after changes ' +
      'constitutes acceptance of the revised Terms.',
  },
];

export default function TermsOfService() {
  return (
    <div className="container">
      <h1 className="page-title">Terms &amp; Conditions</h1>
      <p className="page-sub">Last updated: September 2026</p>
      <div className="card">
        <p>
          These Terms and Conditions govern your use of the FundEd student loan platform
          (the “Service”). Please read them carefully before creating an account.
        </p>
        {sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        <p className="muted">
          Questions? Contact{' '}
          <a href="mailto:support@usfunded.org">support@usfunded.org</a> or{' '}
          <Link href="/register">create an account</Link>.
        </p>
      </div>
    </div>
  );
}