import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const DOC_TYPES = {
  drivers_license: { label: 'US driver’s license', who: 'I am a US resident' },
  passport: { label: 'Valid passport', who: 'I am an international student' },
};

const EMPTY_BILLING = {
  method: 'bank',
  full_name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  bank_name: '',
  account_holder: '',
  account_number: '',
  routing_number: '',
  airtm_handle: '',
  paypal_email: '',
};

function validateBilling(f) {
  if (!f.full_name.trim() || !f.address.trim() || !f.city.trim() || !f.zip.trim() || !f.country.trim()) {
    return 'Please fill the required billing address fields (full name, address, city, ZIP, country).';
  }
  if (f.method === 'bank') {
    const missing = [f.bank_name, f.account_holder, f.account_number, f.routing_number].filter(
      (v) => !v || !String(v).trim()
    );
    if (missing.length) return 'Fill in all bank details — bank name, account holder, account number, and routing number.';
  }
  if (f.method === 'airtm' && !f.airtm_handle.trim()) return 'Enter your AirTM email or username.';
  if (f.method === 'paypal' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.paypal_email.trim())) return 'Enter a valid PayPal email.';
  return '';
}

export default function Verify() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('');
  const [verification, setVerification] = useState(null);
  const [billing, setBilling] = useState(null);
  const [billingForm, setBillingForm] = useState({ ...EMPTY_BILLING });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api
      .get('/verify/identity')
      .then(({ data }) => {
        setVerification(data.verification);
        setBilling(data.billing);
        setBillingForm({ ...EMPTY_BILLING, ...(data.billing || {}) });
        if (data.verification && !docType) {
          setDocType(data.verification.doc_type);
        }
      })
      .catch(() => { setVerification(null); setBilling(null); setBillingForm({ ...EMPTY_BILLING }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAll = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const needsDoc = verification?.status !== 'pending';
    if (needsDoc && !docType) return setError('Choose the document type first');
    if (needsDoc && !file) return setError('Select a file to upload');
    const billingErr = validateBilling(billingForm);
    if (billingErr) return setError(billingErr);
    setBusy(true);
    try {
      const { data } = await api.put('/verify/billing', billingForm);
      setBilling(data.billing);
      setBillingForm({ ...EMPTY_BILLING, ...(data.billing || {}) });
      if (file) {
        const fd = new FormData();
        fd.append('doc_type', docType);
        fd.append('file', file);
        const up = await api.post('/verify/identity', fd);
        setVerification(up.data.verification);
        if (inputRef.current) inputRef.current.value = '';
        setFile(null);
        navigate('/apply');
      } else {
        setMsg('Billing details updated. Your verification is still under review.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await api.delete('/verify/identity');
    setVerification(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const status = verification?.status;
  const docLabel = (t) => DOC_TYPES[t]?.label?.toLowerCase();

  if (status === 'approved') {
    return (
      <div className="container">
        <div className="card center" style={{ textAlign: 'center', padding: '36px' }}>
          <h1 className="page-title">Identity verified</h1>
          <p className="page-sub">
            Your {docLabel(verification.doc_type)} has been reviewed and approved.
            You can apply for a loan now.
          </p>
          <div className="mt">
            <button className="btn" onClick={() => navigate('/dashboard')}>Go to my dashboard</button>{' '}
            <button className="btn outline" onClick={() => navigate('/apply')}>Apply for a loan</button>
          </div>
          <div className="mt">
            <span className="hint" style={{ cursor: 'pointer' }} onClick={remove}>
              Remove verification →
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Verify your identity</h1>
      <p className="page-sub">
        You’ll need to do this once before you can apply for a loan. Upload a photo
        or the scan of the document and add your billing details.
      </p>

      {error && <div className="alert error mb">{error}</div>}
      {msg && <div className="alert success mb">{msg}</div>}

      {status === 'pending' && (
        <div className="alert mb">
          <strong>Under review.</strong> Your {docLabel(verification.doc_type)} has been
          uploaded and an administrator is checking it. You’ll be able to apply once it’s approved.
          {verification.file_name && <div className="hint" style={{ marginTop: 4 }}>{verification.file_name}</div>}
        </div>
      )}
      {status === 'rejected' && (
        <div className="alert error mb">
          <strong>Not approved.</strong> Your {docLabel(verification.doc_type)} was rejected
          {verification.review_note ? ` — ${verification.review_note}` : ''}.
          Upload a clearer copy below to try again.
        </div>
      )}

      <form onSubmit={submitAll}>
        <div className="card">
          <div className="grid grid-2 mb">
            {Object.entries(DOC_TYPES).map(([key, v]) => (
              <button
                type="button"
                key={key}
                className={`verify-opt ${docType === key ? 'selected' : ''}`}
                onClick={() => setDocType(key)}
              >
                <strong>{v.label}</strong>
                <span className="hint">{v.who}</span>
              </button>
            ))}
          </div>

          <div className="field mb">
            <label>Document file (PDF, JPG, PNG, DOC, DOCX — up to 10 MB)</label>
            <input
              className="input"
              type="file"
              ref={inputRef}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </div>
        </div>

        <BillingForm value={billingForm} onChange={setBillingForm} billing={billing} />

        <div className="flex space-between" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn outline"
            onClick={() => navigate('/welcome')}
          >
            {status === 'pending' ? 'Continue for now' : 'Skip for now'}
          </button>
          <button type="submit" className="btn" disabled={busy} style={{ marginLeft: 'auto' }}>
            {busy ? 'Submitting…' : status === 'pending' ? 'Update details' : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BillingForm({ value, onChange, billing }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const pick = (target) => () => onChange({ ...value, method: target });
  const methodLabel =
    billing?.method === 'bank' ? 'Bank' : billing?.method === 'airtm' ? 'AirTM' : billing?.method === 'paypal' ? 'PayPal' : null;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>Billing & payout details</h3>
      <p className="hint" style={{ marginBottom: 14 }}>
        Choose where you’ll receive your funds and enter the matching billing info.
        An administrator reviews this along with your document.
      </p>

      <div className="grid grid-2 mb">
        {[
          { value: 'bank', label: 'Bank', hint: 'US bank account' },
          { value: 'airtm', label: 'AirTM', hint: 'Verified AirTM wallet' },
          { value: 'paypal', label: 'PayPal', hint: 'Verified PayPal account' },
        ].map((m) => (
          <button
            type="button"
            key={m.value}
            className={`verify-opt ${value.method === m.value ? 'selected' : ''}`}
            onClick={pick(m.value)}
            style={{ padding: '14px 18px' }}
          >
            <strong>{m.label}</strong>
            <span className="hint">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="field">
        <label>Billing address</label>
        <input className="input" value={value.full_name} onChange={set('full_name')} placeholder="Full legal name" />
      </div>
      <div className="field">
        <input className="input" value={value.address} onChange={set('address')} placeholder="Street address, apt / suite" />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <input className="input" value={value.city} onChange={set('city')} placeholder="City" />
        </div>
        <div className="field">
          <input className="input" value={value.state} onChange={set('state')} placeholder="State / Province" />
        </div>
        <div className="field">
          <input className="input" value={value.zip} onChange={set('zip')} placeholder="ZIP / Postal code" />
        </div>
        <div className="field">
          <input className="input" value={value.country} onChange={set('country')} placeholder="Country" />
        </div>
      </div>

      {value.method === 'bank' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>Bank billing info</p>
          <div className="field">
            <input className="input" value={value.bank_name} onChange={set('bank_name')} placeholder="Bank name" />
          </div>
          <div className="field">
            <input className="input" value={value.account_holder} onChange={set('account_holder')} placeholder="Account holder name" />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <input className="input" value={value.account_number} onChange={set('account_number')} placeholder="Account number" />
            </div>
            <div className="field">
              <input className="input" value={value.routing_number} onChange={set('routing_number')} placeholder="Routing number" />
            </div>
          </div>
        </div>
      )}

      {value.method === 'airtm' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>AirTM wallet</p>
          <div className="field">
            <input className="input" value={value.airtm_handle} onChange={set('airtm_handle')} placeholder="AirTM email or username" />
          </div>
        </div>
      )}

      {value.method === 'paypal' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>PayPal account</p>
          <div className="field">
            <input className="input" value={value.paypal_email} onChange={set('paypal_email')} placeholder="PayPal email" />
          </div>
        </div>
      )}

      <div className="hint" style={{ marginTop: 12 }}>
        {methodLabel ? `${methodLabel} details on file.` : 'No payout details saved yet.'}
      </div>
    </div>
  );
}