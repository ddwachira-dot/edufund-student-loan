'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', address: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const isUsPhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
    return digits.length === 10 && /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('You must accept the Terms & Conditions to register');
      return;
    }
    if (!PASSWORD_RE.test(form.password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character');
      return;
    }
    if (form.confirm !== form.password) {
      setError('Passwords do not match');
      return;
    }
    if (!isUsPhone(form.phone)) {
      setError('Please enter a valid US phone number');
      return;
    }
    setBusy(true);
    try {
      await register({ ...form, accepted_terms: acceptedTerms });
      router.push('/verify');
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
            <label>Password (min 8 chars with upper, lower, number &amp; special)</label>
            <div className="password-wrap">
              <input className="input" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={8} />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                title={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Confirm password</label>
            <div className="password-wrap">
              <input className="input" type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder="••••••••" required minLength={8} />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Phone (US number)</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" required />
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
              <Link href="/terms" target="_blank">
                Terms &amp; Conditions
              </Link>
            </label>
          </div>
          <button className="btn lg" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="center mt muted">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
        <p className="center mt muted">
          <Link href="/terms">Terms &amp; Conditions</Link> · <Link href="/privacy">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}