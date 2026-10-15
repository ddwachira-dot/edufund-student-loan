import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const mapAuthError = (err) => {
    const code = err.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return 'Invalid email or password';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Please reset your password or wait a few minutes.';
    }
    if (code === 'auth/user-disabled') {
      return 'This account has been disabled.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address';
    }
    return err.response?.data?.message || err.message || 'Sign in failed';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate(user.welcome_seen_at ? '/admin/applications' : '/welcome');
      } else {
        navigate('/welcome');
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!forgotEmail) {
      setError('Please enter your account email address.');
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(forgotEmail);
      setSuccess('Password reset link sent! Please check your email inbox.');
      setForgotMode(false);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{forgotMode ? 'Reset password' : 'Welcome back'}</h1>
        <p className="sub">
          {forgotMode
            ? 'Enter your email to receive a password reset link'
            : 'Sign in to your FundEd account'}
        </p>

        {error && <div className="alert error mb">{error}</div>}
        {success && <div className="alert success mb" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' }}>{success}</div>}

        {forgotMode ? (
          <form onSubmit={handleForgotPassword}>
            <div className="field">
              <label>Email address</label>
              <input
                className="input"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@school.edu"
                required
              />
            </div>
            <button className="btn lg" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Sending link…' : 'Send password reset link'}
            </button>
            <div className="center mt">
              <button
                type="button"
                className="btn text"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #2563eb)', cursor: 'pointer', padding: 0 }}
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                required
              />
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotMode(true);
                    setError('');
                    setSuccess('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #2563eb)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="password-wrap" style={{ marginTop: '6px' }}>
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
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
            <button className="btn lg" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="center mt muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
        <p className="center mt muted">
          <Link to="/terms">Terms &amp; Conditions</Link> · <Link to="/privacy">Privacy Policy</Link>
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