import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { computeEmi, money } from '../../utils/emiClient';

const RATE = 8.5;
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 3000;

function Shield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function Hero() {
  const { user } = useAuth();
  const applyTarget = user ? '/apply' : '/login';
  const [amount, setAmount] = useState(String(MAX_AMOUNT));
  const [months, setMonths] = useState('24');
  const rate = RATE;

  const clampedAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, Number(amount) || MIN_AMOUNT));
  const clampedMonths = Math.min(60, Math.max(6, Math.round(Number(months) || 0)));

  const c = computeEmi(clampedAmount, clampedMonths, rate);

  return (
    <section className="hero mesh-bg" aria-label="FundEd hero">
      <div>
        <span className="eyebrow">Student loans, simplified</span>
        <h1 className="display">
          Borrow for school. <span className="grad-text">Keep focus on class.</span>
        </h1>
        <p className="lead">
          Apply for a student loan in minutes, one fixed 8.5% rate, flexible
          repayment, and funds sent straight to you, your way.
        </p>
        <div className="hero-cta">
          <Link to={applyTarget} className="btn lg accent-grad">
            Apply now <span className="icon">→</span>
          </Link>
          <a href="#how-it-works" className="btn lg outline">
            See how it works
          </a>
        </div>
        <div className="trust">
          <span className="trust-item">
            <span className="dot"><Shield /></span> Bank-level security
          </span>
          <span className="trust-item">
            <span className="dot">★</span> 4.9/5 student rated
          </span>
          <span className="trust-item">
            <span className="dot">✓</span> No credit check
          </span>
        </div>
      </div>

      <div className="calc-card" aria-label="Quick loan estimate">
        <div className="flex space-between mb" style={{ marginBottom: 18 }}>
          <span className="badge-float">Live estimate</span>
          <span className="hint">fixed {rate}% p.a.</span>
        </div>

        <div className="range-block mb">
          <label htmlFor="hero-amount">Loan amount ($)</label>
          <input
            id="hero-amount"
            className="input"
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="hint">Between $500 and $3,000.</div>
        </div>
        <div className="range-block mb">
          <label htmlFor="hero-term">Repayment term (months)</label>
          <input
            id="hero-term"
            className="input"
            type="number"
            min="6"
            max="60"
            step="6"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
          <div className="hint">Between 6 and 60 months.</div>
        </div>

        <div className="row mb" style={{ paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
          <span className="kv">Estimated monthly payment</span>
          <span className="emph">{money(c.emi, 2)}</span>
        </div>
        <div className="row">
          <span className="kv">at {rate}% p.a. · {clampedMonths} months</span>
          <span className="kv">Total: {money(c.total)}</span>
        </div>
      </div>
    </section>
  );
}