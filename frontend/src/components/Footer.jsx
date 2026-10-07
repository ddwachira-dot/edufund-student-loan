import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const subscribe = (e) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setTimeout(() => {
      setStatus('Thanks — you’re on the list.');
      setEmail('');
      setLoading(false);
    }, 800);
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand"><span>Fund</span>Ed</Link>
          <p className="sub">
            Accessible student loans backed by transparent terms, fair interest
            rates, and flexible repayment.
          </p>
          <div className="newsletter" style={{ marginTop: 20 }}>
            <p>Get tips, updates, and new feature announcements by email.</p>
            <form onSubmit={subscribe} noValidate>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status) setStatus(null); }}
                aria-label="Email address for newsletter"
                required
                disabled={loading}
              />
              <button className="btn accent-grad sm" disabled={loading || !valid}>
                Subscribe
              </button>
            </form>
            {status && <p className="msg ok">{status}</p>}
          </div>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <Link to="/apply">Apply for a loan</Link>
          <Link to="/loans">My loans</Link>
          <Link to="/payments">Payments</Link>
          <a href="/#calculator">Loan calculator</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <Link to="/about">About / Our aim</Link>
          <Link to="/learn">Learn hub</Link>
          <Link to="/learn/what-you-need">What you need</Link>
          <Link to="/learn/how-it-works">How it works</Link>
        </div>

        <div className="footer-col">
          <h4>Resources</h4>
          <Link to="/learn/faq">FAQ</Link>
          <Link to="/learn/glossary">Glossary</Link>
          <Link to="/learn/status">Status guide</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <span style={{ marginTop: 8 }}>
            <a href="mailto:support@usfunded.org" style={{ color: 'var(--muted)', fontSize: 13 }}>support@usfunded.org</a>
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Mon–Fri, 9am–6pm ET</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FundEd. All rights reserved.</span>
        <button type="button" onClick={toggle} className="theme-toggle">
          {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          FundEd is an educational loan platform — not a bank. Your actual rate and payment may differ from the calculator based on underwriting and eligibility.
        </span>
      </div>
    </footer>
  );
}