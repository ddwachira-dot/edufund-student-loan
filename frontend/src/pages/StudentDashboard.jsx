import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function StudentDashboard() {
  const { user, firebaseUser, sendVerification, reloadFirebaseUser } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendStatus, setResendStatus] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/loans'),
      api.get('/payments'),
      api.get('/verify/identity').catch(() => ({ data: { verification: null } })),
    ])
      .then(([l, p, v]) => {
        setLoans(l.data.loans || []);
        setPayments(p.data.payments || []);
        setVerification(v.data?.verification || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleResendVerification = async () => {
    setResendStatus('Sending…');
    try {
      await sendVerification();
      setResendStatus('Verification email sent! Check your inbox & spam folder.');
    } catch (err) {
      setResendStatus(err.message || 'Failed to resend email. Please try again.');
    }
  };

  const handleCheckEmailVerified = async () => {
    setCheckingEmail(true);
    try {
      const updated = await reloadFirebaseUser();
      if (updated?.emailVerified) {
        setResendStatus('Email confirmed successfully!');
      } else {
        setResendStatus('Email not confirmed yet. Please click the link in your email.');
      }
    } catch (_) {
      setResendStatus('Could not refresh status. Please try again.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const activeLoans = loans.filter((l) => ['active', 'approved'].includes(l.status));
  const totalDisbursed = loans
    .filter((l) => ['active', 'closed'].includes(l.status))
    .reduce((s, l) => s + Number(l.amount), 0);
  const totalPaid = payments.filter((p) => p.payment_type === 'emi').reduce((s, p) => s + Number(p.amount), 0);

  // EMI payments grouped by YYYY-MM for the area chart
  const byMonth = {};
  payments
    .filter((p) => p.payment_type === 'emi')
    .forEach((p) => {
      const m = String(p.created_at).slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + Number(p.amount);
    });
  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const payout = activeLoans.length ? Math.min(100, Math.round((totalPaid / totalDisbursed) * 100)) : 0;

  const isEmailVerified = Boolean(firebaseUser?.emailVerified);
  const isIdApproved = verification?.status === 'approved';
  const hasApplied = loans.length > 0;

  if (loading) return <div className="container center" style={{ padding: '40px 0' }}>Loading dashboard…</div>;

  return (
    <div className="container">
      <div className="space-between mb" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Welcome, {user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="page-sub" style={{ margin: 0 }}>
            Track your application status, next steps, and loan portfolio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isEmailVerified ? (
            <span className="badge approved" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              ✓ Email confirmed
            </span>
          ) : (
            <span className="badge pending" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              ✉ Email unverified
            </span>
          )}
          {verification?.status ? (
            <span className={`badge ${verification.status}`}>
              ID: {verification.status}
            </span>
          ) : (
            <span className="badge draft">ID: not submitted</span>
          )}
        </div>
      </div>

      {/* ---------------- NEXT STEPS ROADMAP CARD ---------------- */}
      <div className="card mb" style={{ borderLeft: '4px solid var(--accent, #006994)', padding: '24px' }}>
        <div className="space-between" style={{ alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>
              Next steps to get your loan funded
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Follow this 4-step roadmap to qualify and receive your student loan disbursement.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* STEP 1: Email Confirmation */}
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: isEmailVerified ? 'rgba(0, 105, 148, 0.04)' : 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: isEmailVerified ? 'var(--accent, #006994)' : 'var(--line-strong)',
                  color: isEmailVerified ? '#fff' : 'var(--text)',
                }}
              >
                {isEmailVerified ? '✓' : '1'}
              </span>
              <strong style={{ fontSize: 15 }}>1. Confirm Email</strong>
            </div>
            {isEmailVerified ? (
              <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
                Your email address ({user?.email}) is verified and confirmed.
              </p>
            ) : (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                  Confirmation link sent to <strong>{user?.email}</strong>.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn sm secondary"
                    onClick={handleResendVerification}
                    style={{ fontSize: 12 }}
                  >
                    Resend link
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleCheckEmailVerified}
                    disabled={checkingEmail}
                    style={{ fontSize: 12 }}
                  >
                    {checkingEmail ? 'Checking…' : 'I confirmed'}
                  </button>
                </div>
                {resendStatus && (
                  <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8, marginBottom: 0 }}>
                    {resendStatus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Identity & Billing Verification */}
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: isIdApproved ? 'rgba(0, 105, 148, 0.04)' : 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: isIdApproved ? 'var(--accent, #006994)' : 'var(--line-strong)',
                  color: isIdApproved ? '#fff' : 'var(--text)',
                }}
              >
                {isIdApproved ? '✓' : '2'}
              </span>
              <strong style={{ fontSize: 15 }}>2. Verify Identity &amp; Payout</strong>
            </div>
            {isIdApproved ? (
              <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
                Identity document and payout billing address approved.
              </p>
            ) : verification?.status === 'pending' ? (
              <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
                Document submitted. An administrator is currently reviewing it.
              </p>
            ) : verification?.status === 'rejected' ? (
              <div>
                <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 8px' }}>
                  Rejected: {verification.rejection_reason || 'Re-upload required.'}
                </p>
                <Link to="/verify" className="btn sm secondary">Re-upload Document →</Link>
              </div>
            ) : (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                  Upload US driver&apos;s license or passport + payout details.
                </p>
                <Link to="/verify" className="btn sm">Verify Identity →</Link>
              </div>
            )}
          </div>

          {/* STEP 3: Apply for Loan */}
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: hasApplied ? 'rgba(0, 105, 148, 0.04)' : 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: hasApplied ? 'var(--accent, #006994)' : 'var(--line-strong)',
                  color: hasApplied ? '#fff' : 'var(--text)',
                }}
              >
                {hasApplied ? '✓' : '3'}
              </span>
              <strong style={{ fontSize: 15 }}>3. Apply for Loan</strong>
            </div>
            {hasApplied ? (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
                  {loans[0]?.university} — <strong>{money(loans[0]?.amount)}</strong>
                </p>
                <Link to={`/loans/${loans[0]?.id}`} className="btn sm secondary">View Application →</Link>
              </div>
            ) : isIdApproved ? (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                  Identity approved! You are ready to submit your application.
                </p>
                <Link to="/apply" className="btn sm">Apply for Loan →</Link>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Unlocks as soon as your identity document is approved in step 2.
              </p>
            )}
          </div>

          {/* STEP 4: Disbursement & Repayment */}
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: activeLoans.length > 0 ? 'rgba(0, 105, 148, 0.04)' : 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: activeLoans.length > 0 ? 'var(--accent, #006994)' : 'var(--line-strong)',
                  color: activeLoans.length > 0 ? '#fff' : 'var(--text)',
                }}
              >
                {activeLoans.length > 0 ? '✓' : '4'}
              </span>
              <strong style={{ fontSize: 15 }}>4. Payout &amp; EMIs</strong>
            </div>
            {activeLoans.length > 0 ? (
              <div>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
                  Active loan funded! Track reducing balance EMIs below.
                </p>
                <Link to="/loans" className="btn sm secondary">View EMI Schedule →</Link>
              </div>
            ) : hasApplied ? (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Under administrative review. Approved loans generate an EMI schedule automatically.
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Funds are disbursed to your bank, AirTM, or PayPal account upon approval.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- PORTFOLIO OVERVIEW STATS ---------------- */}
      <div className="grid grid-3 mb">
        <div className="stat">
          <div className="label">Total disbursed</div>
          <div className="value">{money(totalDisbursed)}</div>
          <div className="sub">{loans.filter((l) => l.status === 'active').length} active loan(s)</div>
        </div>
        <div className="stat">
          <div className="label">Total repaid</div>
          <div className="value">{money(totalPaid)}</div>
          <div className="sub">across {payments.filter((p) => p.payment_type === 'emi').length} payments</div>
        </div>
        <div className="stat">
          <div className="label">Applications</div>
          <div className="value">{loans.length}</div>
          <div className="sub">
            {loans.filter((l) => l.status === 'pending').length} pending review
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="space-between mb" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Your loan applications</h3>
            {isIdApproved && !hasApplied && (
              <Link to="/apply" className="btn sm">Apply now →</Link>
            )}
          </div>

          {loans.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p className="muted mb">
                You have not submitted any loan applications yet.
              </p>
              {isIdApproved ? (
                <Link to="/apply" className="btn">Start Your Application →</Link>
              ) : (
                <Link to="/verify" className="btn secondary">Verify Identity to Apply →</Link>
              )}
            </div>
          )}

          {loans.slice(0, 5).map((l) => (
            <div key={l.id} className="space-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{l.university}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {l.course} · {l.duration_months} months
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{money(l.amount)}</div>
                <span className={`badge ${l.status}`}>{l.status}</span>
              </div>
            </div>
          ))}

          {loans.length > 0 && (
            <div className="mt">
              <Link to="/loans" className="btn secondary sm">View all loans &amp; schedules →</Link>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb">Repayment progress</h3>
          {activeLoans.length > 0 ? (
            <>
              <div className="progress-track mb">
                <div className="progress-fill" style={{ width: `${payout}%` }} />
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                {money(totalPaid)} repaid of {money(totalDisbursed)} disbursed across active loans ({payout}%)
              </p>
            </>
          ) : (
            <p className="muted">No active loans to track yet. Approved loans appear here with a live EMI tracker.</p>
          )}

          <div className="chart-box mt" style={{ boxShadow: 'none', border: 0, padding: 0 }}>
            <h3>EMI payments over time</h3>
            {chartData.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No EMI payments recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b5bdb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b5bdb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Area type="monotone" dataKey="total" stroke="#3b5bdb" strokeWidth={2} fill="url(#gPaid)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}