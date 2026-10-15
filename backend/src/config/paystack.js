const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const CURRENCY = process.env.PAYSTACK_CURRENCY || 'USD';

function headers() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes('dummy')) {
    const err = new Error('Paystack API keys are not configured. Please set a valid PAYSTACK_SECRET_KEY in .env.');
    err.status = 400;
    throw err;
  }
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

// Convert a USD amount (dollars) into the Paystack minor-unit amount (cents)
function toMinor(amount) {
  return Math.round(Math.max(0, Number(amount)) * 100);
}

async function initialize({ email, amount, reference, metadata, callback_url }) {
  const body = {
    email,
    amount: toMinor(amount),
    reference,
    currency: CURRENCY,
    channels: ['card'],
    metadata,
  };
  if (callback_url) body.callback_url = callback_url;

  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) {
    const msg = data.message ? `Paystack: ${data.message}` : 'Paystack initialization failed';
    const err = new Error(msg);
    // Never return 401 for third-party gateway errors, to avoid invalidating the user's session
    err.status = 400;
    throw err;
  }
  return data.data; // { authorization_url, access_code, reference }
}

async function verify(reference) {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: headers(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) {
    const msg = data.message ? `Paystack: ${data.message}` : 'Paystack verification failed';
    const err = new Error(msg);
    err.status = 400;
    throw err;
  }
  return data.data; // { status, amount, currency, reference, ... }
}

module.exports = { initialize, verify, toMinor };