import { Link } from 'react-router-dom';

const statuses = [
  {
    name: 'pending',
    what: 'Submitted and waiting for review',
    next: 'Bring “Apply for a loan”, confirm your details, upload documents. An admin will review your application and questionnaire answers.',
  },
  {
    name: 'approved',
    what: 'Conditionally approved',
    next: 'An approval moves you to “active” with an EMI schedule. If you see “approved”, your funding details are being finalized.',
  },
  {
    name: 'active',
    what: 'Loan is live',
    next: 'Choose your payout method (bank, verified AirTM or verified PayPal), then follow the EMI schedule you now see on the loan detail page.',
  },
  {
    name: 'closed',
    what: 'Fully repaid',
    next: 'Every instalment has been paid. Nothing else to do — your loan history stays available.',
  },
];

export default function StatusGuide() {
  return (
    <div className="container">
      <h1 className="page-title">Understanding your application status</h1>
      <p className="page-sub">
        Check your application status after you submit. Ours is a live badge at the top of
        every loan and a timeline on the detail page.
      </p>

      <div className="card mb">
        {statuses.map((s) => (
          <div key={s.name} className="status-row">
            <span className={`badge ${s.name}`}>{s.name}</span>
            <div>
              <strong>{s.what}</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>{s.next}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb">
        <h2 className="about-h2">Where to check</h2>
        <p>
          <strong>My Loans</strong> lists every application with its current status badge. Open a
          loan to see the full detail page, its EMI schedule, documents, payments, disbursement, and
          a step-by-step timeline of your loan’s progress.
        </p>
      </div>

      <Link to="/loans" className="btn">Go to My Loans</Link>{' '}
      <Link to="/learn/glossary" className="btn outline">Read the glossary</Link>
    </div>
  );
}