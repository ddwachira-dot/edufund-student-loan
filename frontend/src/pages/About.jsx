import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const values = [
  {
    title: 'Accessible education',
    body: 'Every US student deserves a clear path to fund their tuition without predatory terms.',
  },
  {
    title: 'Transparent terms',
    body: 'Our interest rate is fixed at 8.5% and shown in a full EMI schedule before you sign.',
  },
  {
    title: 'Fair repayment',
    body: 'Flexible, predictable instalments with no hidden fees and a clear EMI schedule.',
  },
  {
    title: 'Secure and verified',
    body: 'Verified accounts only for payouts, encrypted data, and role-based access for students and admins.',
  },
];

const steps = [
  { step: '1', title: 'Apply', body: 'Fill in your details, complete a short questionnaire, and pay the $10 application fee.' },
  { step: '2', title: 'Get reviewed', body: 'Admins review your application and approve it at our fixed 8.5% interest rate.' },
  { step: '3', title: 'Receive funds', body: 'Choose a verified payout method — bank, AirTM or PayPal — after approval.' },
  { step: '4', title: 'Repay', body: 'Follow your EMI schedule and track payments on your dashboard.' },
];

export default function About() {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1 className="page-title">The aim of FundEd</h1>
      <p className="page-sub">
        A student loan platform built to prove that borrowing for education can be fair,
        transparent, and simple.
      </p>

      <div className="card mb">
        <h2 className="about-h2">Why we built this</h2>
        <p>
          FundEd is a full-stack demonstration project: a complete student loan management
          system for students based in the <strong>United States</strong>. Its aim is to show how
          a modern lending platform works end to end — from a student applying for a loan, to an
          admin reviewing and approving it, to automated EMI schedules and repayments — so the
          idea is easy to understand, run, and extend.
        </p>
        <p>
          Rather than hand-waving with static mockups, FundEd implements the real mechanics:
          account registration with signed terms, a structured application with a questionnaire,
          admin review and approval, a fixed 8.5% interest rate, an
          auto-generated reducing-balance EMI schedule, and verified
          payout methods (bank, AirTM or PayPal) after approval.
        </p>
      </div>

      <div className="card mb">
        <h2 className="about-h2">What we believe</h2>
        <div className="grid grid-2">
          {values.map((v) => (
            <div key={v.title} className="about-value">
              <span>
                <strong>{v.title}</strong>
                <br />
                <small>{v.body}</small>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card mb">
        <h2 className="about-h2">How it works</h2>
        <div className="grid grid-4">
          {steps.map((s) => (
            <div key={s.step} className="about-step">
              <span className="step on">{s.step}</span>
              <strong>{s.title}</strong>
              <p className="muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card center" style={{ textAlign: 'center' }}>
        <h2 className="about-h2">Ready to try it?</h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          Sign in with the demo accounts or create a new student account.
        </p>
        {user ? (
          <Link to="/dashboard" className="btn">Go to dashboard</Link>
        ) : (
          <div className="flex" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="btn">Create an account</Link>
            <Link to="/login" className="btn outline">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}