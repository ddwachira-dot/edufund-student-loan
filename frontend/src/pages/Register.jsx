import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('You must accept the Terms & Conditions to register');
      return;
    }
    setBusy(true);
    try {
      await register({ ...form, accepted_terms: acceptedTerms });
      navigate('/verify');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="sub">Register as a student to apply for a loan</p>
        {error && <div className="alert error mb">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@school.edu" required />
          </div>
          <div className="field">
            <label>Password (min 6 characters)</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </div>
          <div className="field">
            <label>Address</label>
            <input className="input" value={form.address} onChange={set('address')} placeholder="Current residential address" />
          </div>
          <div className="field terms-row">
            <input
              id="accept-terms"
              type="checkbox"
              className="terms-check"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <label htmlFor="accept-terms" className="terms-label">
              I have read and agree to the{' '}
              <Link to="/terms" target="_blank">
                Terms &amp; Conditions
              </Link>
            </label>
          </div>
          <button className="btn lg" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="center mt muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
        <p className="center mt muted">
          <Link to="/terms">Terms &amp; Conditions</Link> · <Link to="/privacy">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}