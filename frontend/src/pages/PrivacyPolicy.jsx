import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Information We Collect',
    body:
      'We collect information you provide when you create an account, such as your name, email ' +
      'address, phone number, and address. We also collect information you submit as part of a ' +
      'loan application, including your university, course, income, and supporting documents.',
  },
  {
    title: '2. How We Use Your Information',
    body:
      'We use your information to process loan applications, generate repayment schedules, ' +
      'manage payments, communicate with you, and improve our service. We do not sell your ' +
      'personal information to third parties.',
  },
  {
    title: '3. Payment Information',
    body:
      'Payments (application fee and EMI instalments) are recorded directly to your account. ' +
      'We do not store full card numbers or security codes on our servers.',
  },
  {
    title: '4. Data Retention',
    body:
      'We retain your information for as long as your account is active or as needed to provide ' +
      'the service and comply with legal obligations. You may request deletion of your account ' +
      'and associated data at any time.',
  },
  {
    title: '5. Data Security',
    body:
      'We use encryption, access controls, and secure infrastructure to protect your data. ' +
      'While no method of transmission is 100% secure, we work to keep your information safe.',
  },
  {
    title: '6. Your Rights',
    body:
      'You have the right to access, correct, or delete your personal information. You can ' +
      'contact us to exercise these rights or to ask questions about how your data is handled.',
  },
  {
    title: '7. Changes to This Policy',
    body:
      'We may update this Privacy Policy from time to time. We will notify you of material ' +
      'changes by updating the date on this page.',
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="container">
      <h1 className="page-title">Privacy Policy</h1>
      <p className="page-sub">Last updated: September 2026</p>
      <div className="card">
        <p>
          This Privacy Policy explains how FundEd collects, uses, and protects your personal
          information when you use our student loan platform (the “Service”).
        </p>
        {sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        <p className="muted">
          Questions about this policy? Contact{' '}
          <a href="mailto:privacy@edufund.example">privacy@edufund.example</a> or read our{' '}
          <Link to="/terms">Terms &amp; Conditions</Link>.
        </p>
      </div>
    </div>
  );
}