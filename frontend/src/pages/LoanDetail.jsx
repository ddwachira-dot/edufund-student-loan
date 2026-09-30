import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { docUrl } from '../utils/fileUrl';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function LoanDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [payAmt, setPayAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [disMethod, setDisMethod] = useState('');
  const [disAccount, setDisAccount] = useState('');
  const [disBusy, setDisBusy] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/loans/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load loan'));
  }, [id]);

  useEffect(load, [load]);

  // Confirm a payment when the user returns from the Paystack checkout page
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const reference = qs.get('reference') || qs.get('trxref');
    if (!reference || !id) return;
    setConfirming(true);
    setPayMsg('Confirming your payment with Paystack…');
    api
      .post('/payments/confirm', { application_id: id, purpose: 'emi', reference })
      .then(({ data }) => {
        setPayMsg(data.message || 'Payment successful');
        return load();
      })
      .catch((err) => {
        setPayMsg(err.response?.data?.message || 'Could not confirm payment');
      })
      .finally(() => {
        setConfirming(false);
        window.history.replaceState({}, '', `/loans/${id}`);
      });
  }, [id, load]);

  const payEmi = async () => {
    setError('');
    setPayMsg('');
    setBusy(true);
    try {
      const { data } = await api.post('/payments/initialize', {
        application_id: id,
        purpose: 'emi',
        amount: Number(payAmt),
      });
      setPayMsg('Redirecting you to Paystack to complete the payment…');
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start payment');
      setBusy(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/loans/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const deleteDoc = async (docId) => {
    try {
      await api.delete(`/loans/documents/${docId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete document');
    }
  };

  const saveDisbursement = async (e) => {
    e.preventDefault();
    setError('');
    setDisBusy(true);
    try {
      await api.post(`/loans/${id}/disbursement`, { method: disMethod, account: disAccount });
      setDisMethod('');
      setDisAccount('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save disbursement');
    } finally {
      setDisBusy(false);
    }
  };

  const DISBURSEMENT_METHODS = [
    {
      key: 'bank',
      label: 'Bank deposit',
      placeholder: 'Account number · Routing number',
      hint: 'Direct transfer to your US bank account',
    },
    {
      key: 'airtm',
      label: 'Verified AirTM',
      placeholder: 'AirTM username or registered email',
      hint: 'Payout to a verified AirTM wallet',
    },
    {
      key: 'paypal',
      label: 'Verified PayPal',
      placeholder: 'your@verified-paypal.com',
      hint: 'Payout to a verified PayPal account',
    },
  ];

  const maskAccount = (method, account) => {
    if (method === 'bank') return `•••• ${String(account).slice(-4)}`;
    if (method === 'airtm') return `${String(account).slice(0, 2)}•••`;
    const [user] = String(account).split('@');
    return `${user.slice(0, 2)}•••@•••`;
  };

  const TIMELINE = ['Submitted', 'Under review', 'Approved', 'Disbursed', 'Repaying', 'Closed'];

  const statusTimeline = () => {
    if (loan.status === 'rejected') {
      return TIMELINE.map((label, i) => ({
        label,
        on: i < 2,
        current: i === 2,
        tag: i === 2 ? 'Rejected' : (i >= 3 ? '—' : null),
      }));
    }
    if (loan.status === 'closed') {
      return TIMELINE.map((label, i) => ({ label, on: true, current: i === 5 }));
    }
    const currentIdx = ['active', 'approved'].includes(loan.status) ? (loan.disbursed_at ? 3 : 2) : 1;
    return TIMELINE.map((label, i) => ({ label, on: i <= currentIdx, current: i === currentIdx }));
  };

  if (error && !data) return <div className="container"><div className="alert error">{error}</div></div>;
  if (!data) return <div className="container center">Loading…</div>;

  const { loan, emis = [], documents = [], payments = [] } = data;
  const canPay = ['active', 'approved'].includes(loan.status);

  return (
    <div className="container">
      <Link to="/loans" className="hint">← Back to My Loans</Link>

      <div className="space-between mt">
        <div>
          <h1 className="page-title">{loan.course}</h1>
          <p className="page-sub">
            {loan.university} · Applied {new Date(loan.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ${loan.status}`}>{loan.status}</span>
      </div>

      {error && <div className="alert error mb">{error}</div>}
      {payMsg && (
        <div className={`alert ${payMsg.includes('not') || payMsg.includes('Could not') ? 'error' : 'success'} mb`}>
          {payMsg}
        </div>
      )}

      <div className="card mb">
        <div className="space-between mb">
          <h3 style={{ margin: 0 }}>Where your application stands</h3>
          <span className="hint">Follow your loan through every stage</span>
        </div>
        <div className="status-track">
          {statusTimeline().map((s) => (
            <div key={s.label} className={`status-node ${s.on ? 'on' : ''} ${s.current ? 'current' : ''}`}>
              <span className="status-dot" />
              <span className="status-label">
                {s.label}
                {s.tag && <span className={`badge ${s.tag === 'Rejected' ? 'rejected' : 'draft'}`}>{s.tag}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-3 mb">
        <div className="stat"><div className="label">Amount</div><div className="value">{money(loan.amount)}</div></div>
        <div className="stat">
          <div className="label">Interest rate</div>
          <div className="value">{loan.interest_rate != null ? `${loan.interest_rate}%` : '—'}</div>
          <div className="sub">per annum</div>
        </div>
        <div className="stat">
          <div className="label">Term</div>
          <div className="value">{loan.duration_months} mo</div>
        </div>
      </div>

      {canPay && loan.status === 'active' && (
        <div className="card mb">
          {loan.disbursed_at ? (
            <div className="space-between">
              <div>
                <h3>Disbursed</h3>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {DISBURSEMENT_METHODS.find((m) => m.key === loan.disbursement_method)?.label || loan.disbursement_method} ·{' '}
                  {loan.disbursement_account ? maskAccount(loan.disbursement_method, loan.disbursement_account) : ''}
                </p>
                <p className="hint">Sent {new Date(loan.disbursed_at).toLocaleString()}</p>
              </div>
              <span className="badge progressive" style={{ fontSize: 16 }}>✓</span>
            </div>
          ) : (
            <form onSubmit={saveDisbursement}>
              <h3>How do you want to receive the money?</h3>
              <p className="hint">
                Your approved loan of {money(loan.amount)} will be paid out via your chosen option.
              </p>
              <div className="dis-options">
                {DISBURSEMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={`dis-option ${disMethod === m.key ? 'selected' : ''}`}
                    onClick={() => setDisMethod(m.key)}
                  >
                    <span>
                      <strong>{m.label}</strong>
                      <br />
                      <small>{m.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
              {disMethod && (
                <div className="field" style={{ marginTop: 16 }}>
                  <label>{DISBURSEMENT_METHODS.find((m) => m.key === disMethod).label}</label>
                  <input
                    className="input"
                    value={disAccount}
                    onChange={(e) => setDisAccount(e.target.value)}
                    placeholder={DISBURSEMENT_METHODS.find((m) => m.key === disMethod).placeholder}
                    required
                    {...(disMethod === 'paypal' ? { type: 'email' } : {})}
                  />
                  <p className="hint" style={{ marginTop: 6 }}>
                    The account must be verified — funds are only sent to verified accounts.
                  </p>
                </div>
              )}
              <button className="btn success" type="submit" disabled={disBusy || !disMethod || !disAccount.trim()}>
                {disBusy ? 'Saving…' : 'Confirm payout method'}
              </button>
            </form>
          )}
        </div>
      )}

      {canPay && emis.length > 0 && (
        <div className="card mb">
          <h3>Pay an EMI instalment</h3>
          <p className="hint">
            Your payment is applied to the earliest unpaid instalment. Current due instalment:{' '}
            <strong>
              #{emis.find((e) => e.status !== 'paid')?.installment_no ?? '—'} — {money(emis.find((e) => e.status !== 'paid')?.amount)}
            </strong>
          </p>
          <div className="flex flex-wrap">
            <input
              className="input"
              type="number"
              min="1"
              style={{ maxWidth: 200 }}
              placeholder="Amount (USD)"
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
            />
            <button className="btn success" onClick={payEmi} disabled={busy || confirming || !payAmt}>
              {busy ? 'Opening Paystack…' : confirming ? 'Confirming…' : 'Pay now'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3 className="mb">EMI schedule</h3>
          {emis.length === 0 ? (
            <p className="muted">Schedule is generated once the application is approved.</p>
          ) : (
            <table>
              <thead>
                <tr><th>#</th><th>Due</th><th>Principal</th><th>Interest</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {emis.map((e) => (
                  <tr key={e.id}>
                    <td>{e.installment_no}</td>
                    <td>{new Date(e.due_date).toLocaleDateString()}</td>
                    <td>{money(e.principal)}</td>
                    <td>{money(e.interest)}</td>
                    <td>{money(e.amount)}</td>
                    <td>
                      <span className={`badge ${e.status}`}>{e.status}</span>
                      {e.status === 'partial' && ` · ${money(e.paid_amount)} paid`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div className="card mb">
            <div className="space-between">
              <h3>Documents</h3>
              {canPay && (
                <input type="file" className="btn outline sm" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={uploadFile} />
              )}
            </div>
            {documents.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No documents uploaded yet.</p>}
            {documents.map((d) => (
              <div key={d.id} className="space-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <a href={docUrl(d.stored_name)} target="_blank" rel="noreferrer">
                  {d.file_name}
                </a>
                <div className="flex">
                  <span className="muted" style={{ fontSize: 12 }}>
                    {Math.round((d.size_bytes || 0) / 1024)} KB
                  </span>
                  <button className="btn outline sm" onClick={() => deleteDoc(d.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Payment history</h3>
            {payments.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No payments recorded.</p>}
            {payments.map((p) => (
              <div key={p.id} className="space-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.payment_type} payment</div>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleString()}</div>
                </div>
                <div className="flex">
                  <span style={{ fontWeight: 700 }}>{money(p.amount)}</span>
                  <span className="badge paid">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}