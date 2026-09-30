require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { UPLOAD_DIR } = require('./middleware/upload');
const authRoutes = require('./routes/auth.routes');
const loanRoutes = require('./routes/loan.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const verifyRoutes = require('./routes/verify.routes');
const { authenticate } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Served uploads (documents) are protected by the loan/documents routes;
// also expose a public read endpoint guarded by JWT below.
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);        // auth enforced inside
app.use('/api/payments', paymentRoutes);  // auth enforced inside
app.use('/api/admin', adminRoutes);       // admin enforced inside
app.use('/api/verify', verifyRoutes);     // auth enforced inside

// Public: the interest rate is fixed at 8.5% p.a. for every loan
app.get('/api/rates', (req, res) => {
  const { INTEREST_RATE, MAX_LOAN_AMOUNT } = require('./config/loan');
  return res.json({
    rate: { id: null, label: 'Standard Fixed Rate', rate: INTEREST_RATE },
    max_amount: MAX_LOAN_AMOUNT,
  });
});

// Reusable: verify a document JWT = pass ?token= in query for <img>/<iframe> access
app.get('/api/docs/:stored_name', authenticate, (req, res) => {
  const safe = path.basename(req.params.stored_name);
  const file = path.join(UPLOAD_DIR, safe);
  res.sendFile(file, (err) => {
    if (err) {
      res.status(err.status || 500).json({ message: 'Could not read file' });
    }
  });
});

// Not-found + error handlers
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err.message);
  const status = err.status || err.statusCode || 500;
  const isClientError = status >= 400 && status < 500;
  res.status(status).json({
    message: isClientError ? err.message : 'Internal server error',
  });
});

module.exports = app;