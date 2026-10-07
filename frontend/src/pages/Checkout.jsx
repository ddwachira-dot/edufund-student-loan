import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const PAYSTACK_SRC = 'https://js.paystack.co/v2/inline.js';

function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${PAYSTACK_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = PAYSTACK_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.PaystackPop));
    script.addEventListener('error', () => reject(new Error('The secure payment library could not be loaded.')));
  });
}

function hostedPayUrl(url) {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 'whitelabel=1';
}

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const eyebrowStyle = {
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--muted)',
};

export default function Checkout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | ready | paying | cancelled | error
  const [txn, setTxn] = useState(null);
  const [error, setError] = useState('');
  const [params, setParams] = useState(null);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const p = {
      application_id: qs.get('application_id'),
      purpose: qs.get('purpose'),
      amount: qs.get('amount'),
    };
    setParams(p);

    const invalid =
      !p.application_id ||
      !['emi', 'application_fee'].includes(p.purpose) ||
      (p.purpose === 'emi' && !(Number(p.amount) > 0));
    if (invalid) {
      setError('This payment link is invalid or incomplete.');
      setStatus('error');
      return;
    }

    api
      .post('/payments/initialize', {
        application_id: p.application_id,
        purpose: p.purpose,
        ...(p.purpose === 'emi' ? { amount: Number(p.amount) } : {}),
        callback_url:
          p.purpose === 'emi'
            ? `${window.location.origin}/loans/${p.application_id}`
            : `${window.location.origin}/apply?loan=${p.application_id}`,
      })
      .then(({ data }) => {
        setTxn(data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not start the payment.');
        setStatus('error');
      });
  }, []);

  const isFee = params?.purpose === 'application_fee';
  const purposeLabel = isFee ? 'Application fee' : 'Loan repayment';
  const backHref = params?.application_id && !isFee ? `/loans/${params.application_id}` : '/loans';
  const backLabel = isFee ? 'Back to my loans' : 'Back to loan';

  const pay = async () => {
    if (!txn?.access_code) return;
    setStatus('paying');
    try {
      const PaystackPop = await loadPaystack();
      const pop = new PaystackPop();
      pop.resumeTransaction(txn.access_code, {
        onSuccess: (tx) => {
          const reference = tx?.reference || txn.reference;
          const qs = new URLSearchParams({ reference });
          navigate(
            isFee
              ? `/apply?loan=${params.application_id}&${qs}`
              : `/loans/${params.application_id}?${qs}`
          );
        },
        onCancel: () => {
          setStatus('cancelled');
          if (isFee) {
            api
              .post('/payments/cancel', {
                application_id: params.application_id,
                purpose: 'application_fee',
              })
              .catch(() => {});
          }
        },
        onError: (e) => {
          setError(e?.message || 'The payment window could not be opened.');
          setStatus('error');
        },
      });
    } catch (err) {
      setError(err.message || 'The payment window could not be opened.');
      setStatus('error');
    }
  };

  return (
    <div className="container">
      <div className="card center" style={{ maxWidth: 540, margin: '0 auto', padding: '40px 36px' }}>
        <div style={eyebrowStyle}>Secure checkout</div>

        {status === 'loading' && (
          <>
            <h1 className="page-title" style={{ margin: '14px 0 4px' }}>Preparing your payment…</h1>
            <p className="muted">One moment, please.</p>
          </>
        )}

        {(status === 'ready' || status === 'paying') && txn && params && (
          <>
            <div style={{ fontSize: 46, fontWeight: 700, color: 'var(--heading)', letterSpacing: '-0.03em', margin: '12px 0 0' }}>
              {money(txn.amount)}
            </div>
            <p className="muted" style={{ margin: '2px 0 22px' }}>{purposeLabel}</p>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '14px 18px', textAlign: 'left' }}>
              <div className="space-between"><span className="muted">Loan application</span><strong>#{params.application_id}</strong></div>
              <div className="space-between" style={{ marginTop: 8 }}>
                <span className="muted">Reference</span>
                <strong style={{ fontSize: 13 }}>{txn.reference}</strong>
              </div>
            </div>

            <button className="btn lg" style={{ width: '100%', marginTop: 24 }} onClick={pay} disabled={status === 'paying'}>
              {status === 'paying' ? 'Opening payment window…' : `Pay ${money(txn.amount)}`}
            </button>
            <p className="hint" style={{ marginTop: 14 }}>
              Your card details are entered on a secure, encrypted form and are never stored on our servers.
            </p>
            <p style={{ marginTop: 18, marginBottom: 0 }}>
              <Link to={backHref} className="hint">← {backLabel}</Link>
            </p>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <h1 className="page-title" style={{ margin: '14px 0 4px' }}>Payment cancelled</h1>
            {isFee ? (
              <>
                <p className="muted" style={{ margin: '0 0 8px' }}>
                  Your application has been rejected because the $10 fee was not paid. No money was taken.
                </p>
                <p className="hint" style={{ margin: '0 0 22px' }}>
                  Complete the payment now to restore your application.
                </p>
              </>
            ) : (
              <p className="muted" style={{ margin: '0 0 22px' }}>
                No money was taken. You can try again whenever you are ready.
              </p>
            )}
            <button className="btn" style={{ width: '100%' }} onClick={pay}>Try again</button>
            <p style={{ marginTop: 18, marginBottom: 0 }}>
              <Link to={backHref} className="hint">← {backLabel}</Link>
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="page-title" style={{ margin: '14px 0 4px' }}>Payment could not be started</h1>
            <p className="muted" style={{ margin: '0 0 22px' }}>{error}</p>
            {txn?.access_code && (
              <button className="btn" style={{ width: '100%' }} onClick={pay}>Try again</button>
            )}
            {txn?.authorization_url && (
              <a className="btn outline" style={{ width: '100%', marginTop: txn?.access_code ? 10 : 0 }} href={hostedPayUrl(txn.authorization_url)}>
                Open secure payment page
              </a>
            )}
            <p style={{ marginTop: 18, marginBottom: 0 }}>
              <Link to={backHref} className="hint">← {backLabel}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
