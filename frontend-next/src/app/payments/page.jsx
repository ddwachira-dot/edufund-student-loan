'use client';

import { useEffect, useState } from 'react';
import api from '@/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function Payments() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

function PaymentsContent() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/payments')
      .then(({ data }) => setPayments(data.payments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="container center">Loading…</div>;

  return (
    <div className="container">
      <h1 className="page-title">Payments</h1>
      <p className="page-sub">Your application fees and EMI payments.</p>

      <div className="stat mb" style={{ maxWidth: 260 }}>
        <div className="label">Total paid</div>
        <div className="value">{money(total)}</div>
        <div className="sub">{payments.length} transactions</div>
      </div>

      <div className="card">
        {payments.length === 0 && <p className="muted">No payments yet.</p>}
        {payments.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Loan (if any)</th>
                <th>Method</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${p.payment_type === 'application_fee' ? 'draft' : 'active'}`}>
                      {p.payment_type === 'application_fee' ? 'Application fee' : p.payment_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="muted">{p.reference}</td>
                  <td className="muted">{p.application_id ? `#${p.application_id}` : '—'}</td>
                  <td className="muted">{p.method}</td>
                  <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}