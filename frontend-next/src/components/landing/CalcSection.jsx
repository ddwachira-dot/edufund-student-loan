import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { computeEmi, money } from '../../utils/emiClient';

const RATE = 8.5;
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 3000;

export default function CalcSection() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(String(MAX_AMOUNT));
  const [months, setMonths] = useState('24');
  const rate = RATE;

  const clampedAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, Number(amount) || MIN_AMOUNT));
  const clampedMonths = Math.min(60, Math.max(6, Math.round(Number(months) || 0)));

  const c = computeEmi(clampedAmount, clampedMonths, rate);

  const start = new Date();
  const end = new Date(start.getFullYear(), start.getMonth() + clampedMonths, 1);
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <section id="calculator" className="section" aria-label="Loan calculator">
      <div className="section-head">
        <span className="kicker">Loan calculator</span>
        <h2 className="display">Know your payment before you apply</h2>
        <p>Enter the amounts and watch your estimate update live — no sign-up needed.</p>
      </div>

      <div className="calc-section">
        <div className="calc-panel">
          <div className="card hoverable">
            <div className="range-block mb">
              <label htmlFor="calc-amount">Loan amount ($)</label>
<input id="calc-amount" className="input" type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step="50" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <div className="hint">Between $500 and $3,000.</div>
            </div>

            <div className="range-block mb">
              <label htmlFor="calc-term">Repayment term (months)</label>
              <input id="calc-term" className="input" type="number" min="6" max="60" step="6" value={months} onChange={(e) => setMonths(e.target.value)} />
              <div className="hint">Between 6 and 60 months.</div>
            </div>

            <div className="range-block">
              <label>
                Interest rate
                <output>{rate}% p.a.</output>
              </label>
              <div className="hint">Fixed rate — the same 8.5% for every FundEd loan.</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <h3 className="mb" style={{ marginTop: 0 }}>Your estimate</h3>

          <div className="estimate-head">
            <span className="hint">Estimated monthly payment</span>
            <div className="emi">{money(c.emi, 2)}</div>
            <span className="hint">at {rate}% p.a. over {clampedMonths} months</span>
          </div>

          <div className="calc-results">
            <div className="result-row">
              <span>Loan amount</span>
              <strong>{money(clampedAmount)}</strong>
            </div>
            <div className="result-row">
              <span>Total interest</span>
              <strong>{money(c.interest)}</strong>
            </div>
            <div className="result-row">
              <span>Total repayable</span>
              <strong>{money(c.total)}</strong>
            </div>
            <div className="result-row">
              <span>Timeline</span>
              <strong style={{ fontSize: 16 }}>{fmtDate(start)} → {fmtDate(end)}</strong>
            </div>
          </div>

          <Link href={user ? '/apply' : '/login'} className="btn lg accent-grad" style={{ width: '100%', margin: '22px 0 0' }}>
            Lock in this estimate — Apply now
          </Link>
        </div>
      </div>
    </section>
  );
}