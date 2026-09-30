'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import WelcomeGate from '@/components/WelcomeGate';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const STATUS_FILTERS = ['all', 'pending', 'active', 'approved', 'rejected', 'closed'];

export default function AdminApplications() {
  return (
    <ProtectedRoute adminOnly>
      <WelcomeGate>
        <AdminApplicationsContent />
      </WelcomeGate>
    </ProtectedRoute>
  );
}

function AdminApplicationsContent() {
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null); // detail drawer
  const [action, setAction] = useState(''); // 'approve' | 'reject' | ''
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/applications?status=${filter}`)
      .then(({ data }) => setRows(data.applications))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load applications'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (app) => {
    const { data } = await api.get(`/admin/applications/${app.id}`);
    setSelected(data);
    setAction('');
    setRejectReason('');
  };

  const doApprove = async () => {
    setError('');
    try {
      const { data } = await api.patch(`/admin/applications/${selected.loan.id}/approve`, {});
      setSelected(null);
      load();
      alert(`Approved at a fixed ${data.rate}% p.a. Monthly EMI ≈ $${Number(data.emi).toFixed(2)} across ${data.schedule_rows} instalments.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    }
  };

  const doReject = async () => {
    setError('');
    try {
      await api.patch(`/admin/applications/${selected.loan.id}/reject`, { reason: rejectReason });
      setSelected(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Applications</h1>
      <p className="page-sub">Review applications and manage their status.</p>

      {error && <div className="alert error mb">{error}</div>}

      <div className="flex mb flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`btn ${filter === s ? '' : 'outline'} sm`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No applications with status "{filter}".</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Applicant</th>
                <th>University / Course</th>
                <th>Amount</th>
                <th>Term</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>#{a.id}</td>
                  <td>
                    <strong>{a.applicant_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{a.applicant_email}</div>
                  </td>
                  <td>
                    {a.course}
                    <div className="muted" style={{ fontSize: 12 }}>{a.university}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{money(a.amount)}</td>
                  <td>{a.duration_months} mo</td>
                  <td className="muted">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'pending' && (
                      <button className="btn sm" onClick={() => openDetail(a)}>Review</button>
                    )}
                    {a.status !== 'pending' && (
                      <button className="btn outline sm" onClick={() => openDetail(a)}>View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 720, maxHeight: '88vh', overflow: 'auto', width: '100%' }}>
            <div className="space-between mb">
              <h2 style={{ margin: 0 }}>Application #{selected.loan.id}</h2>
              <span className={`badge ${selected.loan.status}`}>{selected.loan.status}</span>
            </div>

            <div className="grid grid-3 mb">
              <div className="stat"><div className="label">Loan</div><div className="value">{money(selected.loan.amount)}</div></div>
              <div className="stat"><div className="label">Term</div><div className="value">{selected.loan.duration_months} mo</div></div>
              <div className="stat"><div className="label">Fee paid</div><div className="value">{selected.loan.application_fee_paid ? '✓' : '—'}</div></div>
            </div>

            <table className="mb">
              <tbody>
                <tr><td className="muted">Applicant</td><td>{selected.loan.applicant_name} ({selected.loan.email})</td></tr>
                <tr><td className="muted">University</td><td>{selected.loan.university}</td></tr>
                <tr><td className="muted">Course</td><td>{selected.loan.course}</td></tr>
                <tr><td className="muted">Monthly income</td><td>{selected.loan.monthly_income ? money(selected.loan.monthly_income) : '—'}</td></tr>
                <tr><td className="muted">Purpose</td><td>{selected.loan.purpose || '—'}</td></tr>
                <tr><td className="muted">Rate (snapshot)</td><td>{selected.loan.interest_rate != null ? `${selected.loan.interest_rate}%` : '—'}</td></tr>
                {selected.loan.decision_note && (
                  <tr><td className="muted">Decision note</td><td>{selected.loan.decision_note}</td></tr>
                )}
              </tbody>
            </table>

            <h3>Questionnaire</h3>
            {selected.loan.questionnaire && Object.keys(selected.loan.questionnaire).length > 0 && (
              <table className="mb">
                <tbody>
                  {Object.entries(selected.loan.questionnaire).map(([k, v]) => (
                    <tr key={k}>
                      <td className="muted">{String(k).replace(/_/g, ' ')}</td>
                      <td>{Array.isArray(v) ? v.map((i) => `${i.question}: ${i.answer}`).join(', ') : String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selected.documents.length > 0 && (
              <>
                <h3>Documents</h3>
                <ul className="mb">
                  {selected.documents.map((d) => (
                    <li key={d.id}>
                      <a href={`/api/docs/${d.stored_name}?token=${typeof window !== 'undefined' ? localStorage.getItem('sl_token') || '' : ''}`} target="_blank" rel="noreferrer">{d.file_name}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {selected.loan.status === 'pending' && (
              <div className="mt">
                {action === '' && (
                  <div className="flex">
                    <button className="btn success" onClick={() => setAction('approve')}>Approve</button>
                    <button className="btn danger" onClick={() => setAction('reject')}>Reject</button>
                    <button className="btn outline" onClick={() => setSelected(null)}>Close</button>
                  </div>
                )}

                {action === 'approve' && (
                  <>
                    <p className="muted mb">
                      This loan will be approved at the fixed annual interest rate of <strong>8.5%</strong>.
                    </p>
                    <div className="flex">
                      <button className="btn success" onClick={doApprove}>Confirm approval</button>
                      <button className="btn outline" onClick={() => setAction('')}>Back</button>
                    </div>
                  </>
                )}

                {action === 'reject' && (
                  <>
                    <div className="field">
                      <label>Reason (optional)</label>
                      <textarea
                        className="textarea"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. insufficient income evidence"
                      />
                    </div>
                    <div className="flex">
                      <button className="btn danger" onClick={doReject}>Confirm rejection</button>
                      <button className="btn outline" onClick={() => setAction('')}>Back</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {selected.loan.status !== 'pending' && (
              <div className="mt">
                <button className="btn outline" onClick={() => setSelected(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}