'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';

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
          <Link href="/" className="brand"><span>Fund</span>Ed</Link>
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
          <Link href="/apply">Apply for a loan</Link>
          <Link href="/loans">My loans</Link>
          <Link href="/payments">Payments</Link>
          <a href="/#calculator">Loan calculator</a>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <Link href="/about">About / Our aim</Link>
          <Link href="/learn">Learn hub</Link>
          <Link href="/learn/what-you-need">What you need</Link>
          <Link href="/learn/how-it-works">How it works</Link>
        </div>

        <div className="footer-col">
          <h4>Resources</h4>
          <Link href="/learn/faq">FAQ</Link>
          <Link href="/learn/glossary">Glossary</Link>
          <Link href="/learn/status">Status guide</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <span style={{ marginTop: 8 }}>
            <a href="mailto:support@usfunded.org" style={{ color: 'var(--muted)', fontSize: 13 }}>support@usfunded.org</a>
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Mon–Fri, 9am–6pm ET</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FundEd. All rights reserved.</span>
        <span className="disclaimer" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          FundEd is an educational loan platform — not a bank. Your actual rate and payment may differ from the calculator based on underwriting and eligibility.
        </span>
      </div>

      <button type="button" onClick={toggle} className="footer-theme-toggle" aria-label="Toggle dark mode">
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </footer>
  );
}