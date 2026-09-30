'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function MyLoans() {
  return (
    <ProtectedRoute>
      <MyLoansContent />
    </ProtectedRoute>
  );
}

function MyLoansContent() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/loans')
      .then(({ data }) => setLoans(data.loans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container center">Loading…</div>;

  return (
    <div className="container">
      <div className="space-between">
        <div>
          <h1 className="page-title">My Loans</h1>
          <p className="page-sub">All your applications and their status.</p>
        </div>
        <Link href="/apply" className="btn">+ New application</Link>
      </div>

      <div className="grid grid-3">
        {loans.map((l) => {
          const remaining = Math.max(0, l.total_emis - l.paid_emis);
          return (
            <Link key={l.id} href={`/loans/${l.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="stat" style={{ height: '100%' }}>
                <div className="space-between">
                  <span className={`badge ${l.status}`}>{l.status}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="value" style={{ fontSize: 22 }}>{money(l.amount)}</div>
                <div style={{ fontWeight: 600 }}>{l.course}</div>
                <div className="muted" style={{ fontSize: 13 }}>{l.university}</div>
                <div className="muted mt" style={{ fontSize: 12 }}>
                  {l.status === 'active' && (
                    <>
                      EMI {l.paid_emis}/{l.total_emis} paid ·{' '}
                      {remaining > 0 ? `${remaining} remaining` : 'all cleared'}
                    </>
                  )}
                  {l.status === 'pending' && 'Awaiting admin review'}
                  {l.status === 'rejected' && 'Application was declined'}
                  {l.status === 'approved' && `Approved at ${l.interest_rate ?? '—'}%`}
                  {l.status === 'closed' && 'Fully repaid'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {loans.length === 0 && (
        <div className="card center">
          <p className="muted">You have not applied for any loans yet.</p>
          <Link href="/apply" className="btn">Start an application</Link>
        </div>
      )}
    </div>
  );
}