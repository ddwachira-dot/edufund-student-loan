'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '@/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeGate from '@/components/WelcomeGate';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const COLORS = {
  pending: '#f59f00',
  active: '#12b886',
  approved: '#37b24d',
  rejected: '#e03131',
  closed: '#1971c2',
  draft: '#adb5bd',
};

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <WelcomeGate>
        <AdminDashboardContent />
      </WelcomeGate>
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'));
  }, []);

  if (error) return <div className="container"><div className="alert error">{error}</div></div>;
  if (!stats) return <div className="container center">Loading…</div>;

  const byStatus = stats.byStatus || {};
  const statusData = ['pending', 'active', 'approved', 'rejected', 'closed', 'draft']
    .map((s) => ({ name: s, count: byStatus[s] || 0 }))
    .filter((d) => d.count > 0);

  const disbursed = stats.disbursedByMonth || [];
  const emiSeries = (stats.paymentsByMonth || []).map((r) => ({
    month: r.month,
    'EMI payments': Number(r.emi_payments),
    'Application fees': Number(r.fees),
  }));

  const totalPending = byStatus.pending || 0;

  return (
    <div className="container">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-sub">Portfolio performance and review queues.</p>

      <div className="grid grid-3 mb">
        <div className="stat">
          <div className="label">Pending review</div>
          <div className="value" style={{ color: 'var(--amber)' }}>{totalPending}</div>
          <div className="sub">
            {totalPending > 0 ? <Link href="/admin/applications">Review now →</Link> : 'Queue clear'}
          </div>
        </div>
        <div className="stat">
          <div className="label">Total disbursed</div>
          <div className="value">{money(stats.totals.total_disbursed)}</div>
          <div className="sub">approved + active loans</div>
        </div>
        <div className="stat">
          <div className="label">Collected</div>
          <div className="value">{money(Number(stats.totals.emi_collected) + Number(stats.totals.fee_revenue))}</div>
          <div className="sub">
            {money(stats.totals.emi_collected)} EMIs · {money(stats.totals.fee_revenue)} fees
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="chart-box">
          <h3>Applications by status</h3>
          {statusData.length === 0 ? (
            <p className="muted">No applications yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} label
                >
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name] || '#adb5bd'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-box">
          <h3>Monthly revenue</h3>
          {emiSeries.length === 0 ? (
            <p className="muted">No payment activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={emiSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="EMI payments" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Application fees" fill="#12b886" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-box mt">
        <h3>Loan disbursements over time</h3>
        {disbursed.length === 0 ? (
          <p className="muted">No approved loans yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={disbursed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Line type="monotone" dataKey="total" name="Disbursed" stroke="#7048e8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {stats.recentPayments.length > 0 && (
        <div className="card mt">
          <h3 className="mb">Recent payments</h3>
          <table>
            <thead>
              <tr><th>Payer</th><th>Type</th><th>Amount</th><th>Time</th></tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><span className={`badge ${p.payment_type === 'application_fee' ? 'draft' : 'active'}`}>{p.payment_type}</span></td>
                  <td style={{ fontWeight: 700 }}>{money(p.amount)}</td>
                  <td className="muted">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}