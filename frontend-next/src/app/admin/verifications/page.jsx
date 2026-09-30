'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';

const DOC_LABEL = { drivers_license: 'US driver’s license', passport: 'Passport' };
const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

function docUrl(v) {
  return `/uploads/${v.stored_name}`;
}

export default function AdminVerifications() {
  return (
    <ProtectedRoute adminOnly>
      <AdminVerificationsContent />
    </ProtectedRoute>
  );
}

function AdminVerificationsContent() {
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/verifications?status=${filter}`)
      .then(({ data }) => setRows(data.verifications))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load verifications'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = (v) => {
    setSelected(v);
    setAction('');
    setRejectReason('');
  };

  const doApprove = async () => {
    setError('');
    try {
      const { data } = await api.patch(`/admin/verifications/${selected.id}/approve`);
      setSelected(data.verification);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    }
  };

  const doReject = async () => {
    setError('');
    try {
      const { data } = await api.patch(`/admin/verifications/${selected.id}/reject`, {
        reason: rejectReason,
      });
      setSelected(data.verification);
      setAction('');
      setRejectReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Identity verifications</h1>
      <p className="page-sub">
        Review uploaded driver’s licenses and passports. A student can only apply for
        a loan once their document is approved.
      </p>

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
          <p className="muted">No verifications with status "{filter}".</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Applicant</th>
                <th>Document</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td>#{v.id}</td>
                  <td>
                    <strong>{v.applicant_name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{v.applicant_email}</div>
                  </td>
                  <td>{DOC_LABEL[v.doc_type]}</td>
                  <td className="muted">
                    {new Date(v.created_at).toLocaleString()}
                    {v.file_name && <div style={{ fontSize: 12 }}>{v.file_name}</div>}
                  </td>
                  <td><span className={`badge ${v.status}`}>{v.status}</span></td>
                  <td>
                    <button className="btn outline sm" onClick={() => openDetail(v)}>
                      {v.status === 'pending' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div className="card" style={{ maxWidth: 640, maxHeight: '88vh', overflow: 'auto', width: '100%' }}>
            <div className="space-between mb">
              <h2 style={{ margin: 0 }}>Identity # {selected.id}</h2>
              <span className={`badge ${selected.status}`}>{selected.status}</span>
            </div>

            <table className="mb">
              <tbody>
                <tr><td className="muted">Applicant</td><td>{selected.applicant_name} ({selected.applicant_email})</td></tr>
                <tr><td className="muted">Document</td><td>{DOC_LABEL[selected.doc_type]}</td></tr>
                <tr><td className="muted">File</td><td>{selected.file_name}</td></tr>
                <tr><td className="muted">Uploaded</td><td>{new Date(selected.created_at).toLocaleString()}</td></tr>
                {selected.review_note && (
                  <tr><td className="muted">Review note</td><td>{selected.review_note}</td></tr>
                )}
              </tbody>
            </table>

            <div className="mb" style={{ textAlign: 'center' }}>
              {selected.stored_name ? (
                /^image\//.test(selected.mime_type || '') ? (
                  <img
                    src={docUrl(selected)}
                    alt={selected.file_name}
                    style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid var(--line)' }}
                  />
                ) : (
                  <a className="btn outline sm" href={docUrl(selected)} target="_blank" rel="noreferrer">
                    Open document
                  </a>
                )
              ) : (
                <span className="hint">No file stored</span>
              )}
            </div>

            {selected.billing_method && (
              <div className="mb">
                <h3 style={{ margin: '0 0 8px' }}>Billing & payout details</h3>
                <table>
                  <tbody>
                    <tr>
                      <td className="muted">Payout method</td>
                      <td>
                        <span className={`badge ${selected.billing_method}`}>
                          {selected.billing_method === 'bank' ? 'Bank' : selected.billing_method === 'airtm' ? 'AirTM' : 'PayPal'}
                        </span>
                      </td>
                    </tr>
                    <tr><td className="muted">Full name</td><td>{selected.billing_full_name}</td></tr>
                    <tr>
                      <td className="muted">Address</td>
                      <td>
                        {selected.billing_address}, {selected.billing_city}
                        {selected.billing_state ? `, ${selected.billing_state}` : ''} {selected.billing_zip}
                        {selected.billing_country ? `, ${selected.billing_country}` : ''}
                      </td>
                    </tr>
                    {selected.billing_method === 'bank' && (
                      <>
                        <tr><td className="muted">Bank name</td><td>{selected.billing_bank_name}</td></tr>
                        <tr><td className="muted">Account holder</td><td>{selected.billing_account_holder}</td></tr>
                        <tr><td className="muted">Account number</td><td>•••• {String(selected.billing_account_number || '').slice(-4)}</td></tr>
                        <tr><td className="muted">Routing number</td><td>{selected.billing_routing_number}</td></tr>
                      </>
                    )}
                    {selected.billing_method === 'airtm' && (
                      <tr><td className="muted">AirTM handle</td><td>{selected.billing_airtm_handle}</td></tr>
                    )}
                    {selected.billing_method === 'paypal' && (
                      <tr><td className="muted">PayPal email</td><td>{selected.billing_paypal_email}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {selected.status === 'pending' && action === '' && (
              <div className="flex mt">
                <button className="btn success" onClick={() => setAction('approve')}>Approve</button>
                <button className="btn danger" onClick={() => setAction('reject')}>Reject</button>
                <button className="btn outline" onClick={() => setSelected(null)}>Close</button>
              </div>
            )}

            {selected.status === 'pending' && action === 'approve' && (
              <div className="flex mt">
                <button className="btn success" onClick={doApprove}>Confirm approval</button>
                <button className="btn outline" onClick={() => setAction('')}>Back</button>
              </div>
            )}

            {selected.status === 'pending' && action === 'reject' && (
              <div className="mt">
                <div className="field">
                  <label>Reason (optional — shown to the student)</label>
                  <textarea
                    className="textarea"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. document is blurry or expired"
                  />
                </div>
                <div className="flex">
                  <button className="btn danger" onClick={doReject}>Confirm rejection</button>
                  <button className="btn outline" onClick={() => setAction('')}>Back</button>
                </div>
              </div>
            )}

            {selected.status !== 'pending' && (
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