import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function AdminRates() {
  const [fixed, setFixed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/rates')
      .then(({ data }) => setFixed(data.rate))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load rate'));
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Interest Rate</h1>
      <p className="page-sub">Every FundEd loan carries the same fixed annual rate — it cannot be changed.</p>

      {error && <div className="alert error mb">{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3 className="mb">Standard rate</h3>
          {fixed ? (
            <>
              <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--heading)' }}>
                {fixed.rate}% <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)' }}>p.a.</span>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>{fixed.label}</p>
              <span className="badge paid">fixed</span>
            </>
          ) : (
            <p className="muted">Loading…</p>
          )}
        </div>

        <div className="card">
          <h3 className="mb">How it works</h3>
          <ul className="muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
            <li>The rate is locked at 8.5% p.a. for every approved loan.</li>
            <li>Loans run from a minimum of $500 up to a maximum principal of $3,000.</li>
            <li>Your monthly EMI is generated from the amount, term and this fixed rate.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
