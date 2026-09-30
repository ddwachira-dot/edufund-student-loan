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

export default function Verify() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('');
  const [verification, setVerification] = useState(null);
  const [billing, setBilling] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api
      .get('/verify/identity')
      .then(({ data }) => {
        setVerification(data.verification);
        setBilling(data.billing);
        if (data.verification && !docType) {
          setDocType(data.verification.doc_type);
        }
      })
      .catch(() => { setVerification(null); setBilling(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    setError('');
    if (!docType) return setError('Choose the document type first');
    if (!file) return setError('Select a file to upload');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      const { data } = await api.post('/verify/identity', fd);
      setVerification(data.verification);
      if (inputRef.current) inputRef.current.value = '';
      setFile(null);
      navigate('/apply');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
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
        or scan of the document, add your billing details, and an administrator will review it.
      </p>

      {error && <div className="alert error mb">{error}</div>}

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

      <form className="card" onSubmit={upload}>
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

        <div className="field">
          <label>Document file (PDF, JPG, PNG, DOC, DOCX — up to 10 MB)</label>
          <input
            className="input"
            type="file"
            ref={inputRef}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </div>

        <div className="flex space-between">
          {status === 'pending' ? (
            <>
              <button
                type="button"
                className="btn outline"
                onClick={() => navigate('/welcome')}
              >
                Continue for now
              </button>
              <button className="btn" disabled={busy}>
                {busy ? 'Uploading…' : 'Replace document'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn outline"
                onClick={() => navigate('/welcome')}
              >
                Skip for now
              </button>
              <button className="btn" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload document'}
              </button>
            </>
          )}
        </div>
      </form>

      <BillingForm billing={billing} onSaved={setBilling} />
    </div>
  );
}

function BillingForm({ billing, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_BILLING, ...(billing || {}) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setForm({ ...EMPTY_BILLING, ...(billing || {}) });
  }, [billing]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErr('');
    setMsg('');
  };

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!form.full_name.trim() || !form.address.trim() || !form.city.trim() || !form.zip.trim() || !form.country.trim()) {
      return setErr('Please fill the required billing address fields (full name, address, city, ZIP, country).');
    }
    if (form.method === 'bank') {
      const missing = [form.bank_name, form.account_holder, form.account_number, form.routing_number].filter((v) => !v || !String(v).trim());
      if (missing.length) return setErr('Fill in all bank details — bank name, account holder, account number, and routing number.');
    }
    if (form.method === 'airtm' && !form.airtm_handle.trim()) {
      return setErr('Enter your AirTM email or username.');
    }
    if (form.method === 'paypal' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.paypal_email.trim())) {
      return setErr('Enter a valid PayPal email.');
    }
    setBusy(true);
    try {
      const { data } = await api.put('/verify/billing', form);
      if (onSaved) onSaved(data.billing);
      setMsg('Billing details saved.');
    } catch (er) {
      setErr(er.response?.data?.message || 'Failed to save billing details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={save} style={{ marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>Billing & payout details</h3>
      <p className="hint" style={{ marginBottom: 14 }}>
        Choose where you’ll receive your funds and enter the matching billing info.
        An administrator reviews this along with your document.
      </p>

      {err && <div className="alert error mb">{err}</div>}
      {msg && <div className="alert success mb">{msg}</div>}

      <div className="grid grid-2 mb">
        {[
          { value: 'bank', label: 'Bank', hint: 'US bank account' },
          { value: 'airtm', label: 'AirTM', hint: 'Verified AirTM wallet' },
          { value: 'paypal', label: 'PayPal', hint: 'Verified PayPal account' },
        ].map((m) => (
          <button
            type="button"
            key={m.value}
            className={`verify-opt ${form.method === m.value ? 'selected' : ''}`}
            onClick={() => { setForm((f) => ({ ...f, method: m.value })); setErr(''); setMsg(''); }}
            style={{ padding: '14px 18px' }}
          >
            <strong>{m.label}</strong>
            <span className="hint">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="field">
        <label>Billing address</label>
        <input className="input" value={form.full_name} onChange={set('full_name')} placeholder="Full legal name" />
      </div>
      <div className="field">
        <input className="input" value={form.address} onChange={set('address')} placeholder="Street address, apt / suite" />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <input className="input" value={form.city} onChange={set('city')} placeholder="City" />
        </div>
        <div className="field">
          <input className="input" value={form.state} onChange={set('state')} placeholder="State / Province" />
        </div>
        <div className="field">
          <input className="input" value={form.zip} onChange={set('zip')} placeholder="ZIP / Postal code" />
        </div>
        <div className="field">
          <input className="input" value={form.country} onChange={set('country')} placeholder="Country" />
        </div>
      </div>

      {form.method === 'bank' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>Bank billing info</p>
          <div className="field">
            <input className="input" value={form.bank_name} onChange={set('bank_name')} placeholder="Bank name" />
          </div>
          <div className="field">
            <input className="input" value={form.account_holder} onChange={set('account_holder')} placeholder="Account holder name" />
          </div>
          <div className="grid grid-2">
            <div className="field">
              <input className="input" value={form.account_number} onChange={set('account_number')} placeholder="Account number" />
            </div>
            <div className="field">
              <input className="input" value={form.routing_number} onChange={set('routing_number')} placeholder="Routing number" />
            </div>
          </div>
        </div>
      )}

      {form.method === 'airtm' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>AirTM wallet</p>
          <div className="field">
            <input className="input" value={form.airtm_handle} onChange={set('airtm_handle')} placeholder="AirTM email or username" />
          </div>
        </div>
      )}

      {form.method === 'paypal' && (
        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <p className="hint" style={{ marginBottom: 10 }}>PayPal account</p>
          <div className="field">
            <input className="input" value={form.paypal_email} onChange={set('paypal_email')} placeholder="PayPal email" />
          </div>
        </div>
      )}

      <div className="flex space-between">
        {billing && (
          <span className="hint">
            {billing.method === 'bank' ? 'Bank' : billing.method === 'airtm' ? 'AirTM' : 'PayPal'} details on file
          </span>
        )}
        <button className="btn" disabled={busy} style={{ marginLeft: 'auto' }}>
          {busy ? 'Saving…' : billing ? 'Update billing details' : 'Save billing details'}
        </button>
      </div>
    </form>
  );
}