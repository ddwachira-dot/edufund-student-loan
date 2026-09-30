const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const CURRENCY = process.env.PAYSTACK_CURRENCY || 'USD';

function headers() {
  if (!SECRET) {
    const err = new Error('Paystack secret key is not configured');
    err.status = 500;
    throw err;
  }
  return {
    Authorization: `Bearer ${SECRET}`,
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
    const err = new Error(data.message || 'Paystack initialization failed');
    err.status = res.status || 502;
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
    const err = new Error(data.message || 'Paystack verification failed');
    err.status = res.status || 502;
    throw err;
  }
  return data.data; // { status, amount, currency, reference, ... }
}

module.exports = { initialize, verify, toMinor };