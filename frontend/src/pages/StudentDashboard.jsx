import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/loans'), api.get('/payments')])
      .then(([l, p]) => {
        setLoans(l.data.loans);
        setPayments(p.data.payments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeLoans = loans.filter((l) => ['active', 'approved'].includes(l.status));
  const totalDisbursed = loans
    .filter((l) => ['active', 'closed'].includes(l.status))
    .reduce((s, l) => s + Number(l.amount), 0);
  const totalPaid = payments.filter((p) => p.payment_type === 'emi').reduce((s, p) => s + Number(p.amount), 0);

  // EMI payments grouped by YYYY-MM for the area chart
  const byMonth = {};
  payments
    .filter((p) => p.payment_type === 'emi')
    .forEach((p) => {
      const m = String(p.created_at).slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + Number(p.amount);
    });
  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const payout = activeLoans.length ? Math.min(100, Math.round((totalPaid / totalDisbursed) * 100)) : 0;

  if (loading) return <div className="container center">Loading…</div>;

  return (
    <div className="container">
      <h1 className="page-title">Hello, {user?.name?.split(' ')[0]}</h1>
      <p className="page-sub">Here is an overview of your loan portfolio.</p>

      <div className="grid grid-3 mb">
        <div className="stat">
          <div className="label">Total disbursed</div>
          <div className="value">{money(totalDisbursed)}</div>
          <div className="sub">{loans.filter((l) => l.status === 'active').length} active loan(s)</div>
        </div>
        <div className="stat">
          <div className="label">Total repaid</div>
          <div className="value">{money(totalPaid)}</div>
          <div className="sub">across {payments.filter((p) => p.payment_type === 'emi').length} payments</div>
        </div>
        <div className="stat">
          <div className="label">Applications</div>
          <div className="value">{loans.length}</div>
          <div className="sub">
            {loans.filter((l) => l.status === 'pending').length} pending review
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="mb">Your loans</h3>
          {loans.length === 0 && (
            <p className="muted">
              No applications yet.{' '}
              <Link to="/apply">Apply for your first loan →</Link>
            </p>
          )}
          {loans.slice(0, 5).map((l) => (
            <div key={l.id} className="space-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{l.university}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {l.course} · {l.duration_months} months
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{money(l.amount)}</div>
                <span className={`badge ${l.status}`}>{l.status}</span>
              </div>
            </div>
          ))}
          {loans.length > 0 && (
            <div className="mt">
              <Link to="/loans" className="btn secondary sm">View all loans</Link>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb">Repayment progress</h3>
          {activeLoans.length > 0 ? (
            <>
              <div className="progress-track mb">
                <div className="progress-fill" style={{ width: `${payout}%` }} />
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                {money(totalPaid)} repaid of {money(totalDisbursed)} disbursed across active loans ({payout}%)
              </p>
            </>
          ) : (
            <p className="muted">No active loans to track yet. Approved loans appear here with a live EMI tracker.</p>
          )}
          <div className="chart-box mt" style={{ boxShadow: 'none', border: 0, padding: 0 }}>
            <h3>EMI payments over time</h3>
            {chartData.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No EMI payments recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Area type="monotone" dataKey="total" stroke="#3b5bdb" strokeWidth={2} fill="url(#gPaid)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}