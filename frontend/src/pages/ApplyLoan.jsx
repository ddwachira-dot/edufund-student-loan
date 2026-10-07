import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const FEE = 10;
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 3000;

function estimateEmi(amount, months, annualRatePct) {
  const r = annualRatePct / 100 / 12;
  if (!(amount > 0) || months < 1) return 0;
  if (r === 0) return amount / months;
  return amount * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

const emptyForm = {
  university: '',
  course: '',
  amount: '',
  duration_months: '12',
  monthly_income: '',
  purpose: '',
  questionnaire: {
    employment_status: 'part_time',
    co_signer_available: false,
    credit_score: 'fair',
    has_scholarship: false,
    gpa: '',
  },
};

export default function ApplyLoan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeRate, setActiveRate] = useState(null);
  const [verified, setVerified] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    api
      .get('/rates')
      .then(({ data }) => setActiveRate(data.rate))
      .catch(() => setActiveRate(null));
    api
      .get('/verify/identity')
      .then(({ data }) => setVerified(data.verification || null))
      .catch(() => setVerified(null))
      .finally(() => setVerifying(false));
  }, []);

  // Confirm the $10 application fee when the user returns from the Paystack checkout
  const cbLoan = new URLSearchParams(window.location.search).get('loan');
  const cbRef =
    new URLSearchParams(window.location.search).get('reference') ||
    new URLSearchParams(window.location.search).get('trxref');
  useEffect(() => {
    if (verifying || !cbLoan || !cbRef) return;
    setConfirmBusy(true);
    api
      .post('/payments/confirm', {
        application_id: cbLoan,
        purpose: 'application_fee',
        reference: cbRef,
      })
      .then(({ data }) => {
        setSuccess(
          `Application #${Number(cbLoan)} submitted and $${FEE} fee paid. Upload supporting documents next.`
        );
        setForm((f) => ({ ...f, lastId: cbLoan }));
        setStep(3);
        window.history.replaceState({}, '', '/apply');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Payment confirmation failed');
        window.history.replaceState({}, '', '/apply');
      })
      .finally(() => setConfirmBusy(false));
  }, [verifying]);

  const estEmi = useMemo(() => {
    const amount = Number(form.amount);
    const months = Number(form.duration_months);
    const rate = activeRate?.rate ?? 8.5;
    return estimateEmi(amount, months, rate);
  }, [form.amount, form.duration_months, activeRate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setQ = (k) => (e) =>
    setForm((f) => ({ ...f, questionnaire: { ...f.questionnaire, [k]: e.target.value } }));

  const requiredAnswers = [
    'employment_status',
    'co_signer',
    'credit_history',
    'scholarship',
    ...(answers['co_signer'] === 'yes' ? ['co_signer_name', 'co_signer_phone', 'co_signer_email'] : []),
  ];
  const cosignerValid =
    answers['co_signer'] !== 'yes' ||
    ((answers.co_signer_phone || '').replace(/\D/g, '').length >= 7 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.co_signer_email || ''));

  const canNext =
    step === 1
      ? form.university && form.course && Number(form.amount) >= MIN_AMOUNT && Number(form.amount) <= MAX_AMOUNT && form.duration_months
      : requiredAnswers.every((k) => (answers[k] || '').trim()) && cosignerValid;

  const pickAnswer = (q) => (e) => {
    const value = e.target.value;
    setAnswers((a) => {
      const next = { ...a, [q]: value };
      if (q === 'co_signer' && value !== 'yes') {
        delete next.co_signer_name;
        delete next.co_signer_phone;
        delete next.co_signer_email;
      }
      return next;
    });
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const labels = Object.entries(answers)
        .filter(([q, v]) => v && (!q.startsWith('co_signer_') || answers['co_signer'] === 'yes'))
        .map(([q, v]) => ({ question: q, answer: v }));
      const { data } = await api.post('/loans', {
        university: form.university,
        course: form.course,
        amount: Number(form.amount),
        duration_months: Number(form.duration_months),
        monthly_income: form.monthly_income ? Number(form.monthly_income) : null,
        purpose: form.purpose,
        questionnaire: { ...form.questionnaire, interview_answers: labels },
      });
      if (data.loan) {
        navigate(`/checkout?application_id=${data.loan.id}&purpose=application_fee`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong submitting the application');
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/loans/${form.lastId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      e.target.value = '';
    }
  };

  if (verifying) {
    return <div className="center container">Loading…</div>;
  }

  if (!verified || verified.status === 'rejected') {
    const rejected = verified?.status === 'rejected';
    return (
      <div className="container" style={{ minHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="card center" style={{ textAlign: 'center', padding: '36px' }}>
          <h1 className="page-title">Verify your identity first</h1>
          {rejected ? (
            <p className="page-sub" style={{ textAlign: 'center', margin: '12px auto 24px', maxWidth: 520 }}>
              Your identity document was <strong>rejected</strong>
              {verified.review_note ? ` — ${verified.review_note}` : ''}. Upload a clearer
              copy to try again.
            </p>
          ) : (
            <p className="page-sub" style={{ textAlign: 'center', margin: '12px auto 24px', maxWidth: 520 }}>
              Before you can apply for a loan, upload either a <strong>US driver’s
              license</strong> (US residents) or a valid <strong>passport</strong>{' '}
              (international students) for admin review. It only takes a moment.
            </p>
          )}
          <div className="mt">
            <Link to="/verify" className="btn">Verify my identity</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {verified?.status === 'pending' && (
        <div className="alert mb">
          <strong>Identity under review.</strong> Your document is being checked by an
          administrator — you can prepare your application now. It will be submitted once
          your identity is approved.
        </div>
      )}
      <div className="card" style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="page-title">Apply for a Student Loan</h1>
        <p className="page-sub">Three quick steps — a $10 application fee is charged at review time.</p>

        <div className="stepper">
          <div className={`step ${step >= 1 ? 'on' : ''}`}>1</div>
          <div className="step-line" />
          <div className={`step ${step >= 2 ? 'on' : ''}`}>2</div>
          <div className="step-line" />
          <div className={`step ${step >= 3 ? 'on' : ''}`}>3</div>
          <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>
            Loan details · Questionnaire · Review & submit
          </span>
        </div>

        {error && <div className="alert error mb">{error}</div>}
        {success && <div className="alert success mb">{success}</div>}

        {step === 1 && (
          <>
            <div className="callout mb">
              <strong>Before you begin</strong>
              <p className="muted" style={{ margin: '4px 0 8px' }}>
                Have your school and course details, income estimate, and a card for the $10 fee
                ready.
              </p>
              <Link to="/learn/what-you-need" className="hint">See the full checklist →</Link>
            </div>
            <div className="signature-row">
              <div className="field">
                <label>University / institution *</label>
                <input className="input" value={form.university} onChange={set('university')} placeholder="Springfield State University" />
              </div>
              <div className="field">
                <label>Course / program *</label>
                <input className="input" value={form.course} onChange={set('course')} placeholder="B.Sc. Computer Science" />
              </div>
            </div>
            <div className="signature-row">
              <div className="field">
                <label>Loan amount (USD) *</label>
                <input className="input" type="number" min={MIN_AMOUNT} max={MAX_AMOUNT} step="50" value={form.amount} onChange={set('amount')} placeholder="500" />
                <span className="hint">Loans run from $500 to $3,000.</span>
              </div>
              <div className="field">
                <label>Repayment term (months) *</label>
                <select className="select" value={form.duration_months} onChange={set('duration_months')}>
                  {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="signature-row">
              <div className="field">
                <label>Monthly income (optional)</label>
                <input className="input" type="number" min="0" value={form.monthly_income} onChange={set('monthly_income')} placeholder="1200" />
              </div>
              <div className="field">
                <label>Purpose (optional)</label>
                <input className="input" value={form.purpose} onChange={set('purpose')} placeholder="Tuition for the upcoming semester" />
              </div>
            </div>
            {Number(form.amount) > 0 && (
              <div className="estimate">
                <div>
                  <span className="hint">Estimated monthly payment</span>
                  <div className="value">
                    ${estEmi.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <span className="hint">
                    at {activeRate?.rate ?? 8.5}% p.a. over {form.duration_months} months
                    {activeRate ? ` · ${activeRate.label}` : ' (default rate)'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="hint">Total repaid</span>
                  <div className="value">
                    ${(estEmi * Number(form.duration_months)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <span className="hint">incl. interest</span>
                </div>
              </div>
            )}
            <div className="flex space-between">
              <button className="btn outline" onClick={() => navigate('/dashboard')}>Cancel</button>
              <button className="btn" onClick={() => setStep(2)} disabled={!canNext}>Continue →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Questionnaire</h3>
            <div className="field">
              <label>1. What is your current employment status?</label>
              <select className="select" value={answers['employment_status'] || ''} onChange={pickAnswer('employment_status')}>
                <option value="">Select…</option>
                <option value="full-time">Full-time employed</option>
                <option value="part-time">Part-time employed</option>
                <option value="internship">Paid internship</option>
                <option value="unemployed">Not working</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>2. Do you have a co-signer available?</label>
              <select className="select" value={answers['co_signer'] || ''} onChange={pickAnswer('co_signer')}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            {answers['co_signer'] === 'yes' && (
              <>
                <div className="signature-row">
                  <div className="field">
                    <label>Co-signer full name *</label>
                    <input className="input" value={answers['co_signer_name'] || ''} onChange={pickAnswer('co_signer_name')} placeholder="Jane Doe" />
                  </div>
                  <div className="field">
                    <label>Co-signer phone number *</label>
                    <input className="input" type="tel" value={answers['co_signer_phone'] || ''} onChange={pickAnswer('co_signer_phone')} placeholder="+1 555 123 4567" />
                  </div>
                </div>
                <div className="field">
                  <label>Co-signer email *</label>
                  <input className="input" type="email" value={answers['co_signer_email'] || ''} onChange={pickAnswer('co_signer_email')} placeholder="jane.doe@example.com" />
                  <span className="hint">We may contact your co-signer to verify the application.</span>
                </div>
              </>
            )}
            <div className="field">
              <label>3. How would you describe your credit history?</label>
              <select className="select" value={answers['credit_history'] || ''} onChange={pickAnswer('credit_history')}>
                <option value="">Select…</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="none">No history yet</option>
              </select>
            </div>
            <div className="field">
              <label>4. Do you have a scholarship or funding for part of your studies?</label>
              <select className="select" value={answers['scholarship'] || ''} onChange={pickAnswer('scholarship')}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="flex space-between">
              <button className="btn outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn" onClick={() => setStep(3)} disabled={!canNext}>Review & pay →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Review & submit</h3>
            <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div className="space-between"><span className="muted">University</span><strong>{form.university}</strong></div>
              <div className="space-between"><span className="muted">Course</span><strong>{form.course}</strong></div>
              <div className="space-between"><span className="muted">Amount</span><strong>${Number(form.amount).toLocaleString()}</strong></div>
              <div className="space-between"><span className="muted">Term</span><strong>{form.duration_months} months</strong></div>
              {answers['co_signer'] === 'yes' && (
                <div className="space-between">
                  <span className="muted">Co-signer</span>
                  <strong>
                    {answers.co_signer_name} · {answers.co_signer_phone} · {answers.co_signer_email}
                  </strong>
                </div>
              )}
              <div className="space-between"><span className="muted">Application fee</span><strong>${FEE}.00</strong></div>
            </div>

            {success && form.lastId && (
              <div className="mt">
                <h3>Supporting documents</h3>
                <p className="hint">Upload your ID, transcripts or admission letter (PDF, JPG, PNG up to 10 MB).</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={uploadFile} />
                <p className="mt muted" style={{ fontSize: 13 }}>
                  Your application is pending admin review. <Link to="/loans">View your loans</Link>
                </p>
              </div>
            )}

            {!success ? (
              <div className="flex space-between mt">
                <button className="btn outline" onClick={() => setStep(2)}>← Back</button>
                <button className="btn lg success" onClick={submit} disabled={busy}>
                  {busy ? 'Processing payment…' : `Submit & pay $${FEE} fee`}
                </button>
              </div>
            ) : (
              <div className="flex mt">
                <Link to="/loans" className="btn">Go to My Loans</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}