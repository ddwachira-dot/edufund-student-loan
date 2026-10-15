const { Resend } = require('resend');
const templates = require('./templates');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'USFunded <notifications@usfunded.org>';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendMail({ to, subject, html }) {
  if (!to) {
    console.warn('[Email Service] Recipient email is missing');
    return { success: false, error: 'Recipient missing' };
  }

  if (!resend) {
    console.log(`[Email Service - Simulated] To: ${to} | Subject: "${subject}" (RESEND_API_KEY not configured)`);
    return { success: true, simulated: true };
  }

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, response };
  } catch (err) {
    console.error(`[Email Service Error] Failed to send to ${to}:`, err?.message || err);
    return { success: false, error: err };
  }
}

/**
 * 1. Send Identity Verification Request / Instruction
 */
async function sendVerificationRequest({ email, name, verifyUrl }) {
  const html = templates.verifyIdentityRequestTemplate({ name, verifyUrl });
  return sendMail({
    to: email,
    subject: 'Action Required: Verify Your Student Identity - USFunded',
    html,
  });
}

/**
 * 2. Send Identity Verification Approved
 */
async function sendVerificationApproved({ email, name, applyUrl }) {
  const html = templates.verificationApprovedTemplate({ name, applyUrl });
  return sendMail({
    to: email,
    subject: 'Identity Verified & Approved - USFunded',
    html,
  });
}

/**
 * 3. Send Identity Verification Rejected
 */
async function sendVerificationRejected({ email, name, reason, reuploadUrl }) {
  const html = templates.verificationRejectedTemplate({ name, reason, reuploadUrl });
  return sendMail({
    to: email,
    subject: 'Action Required: Update Your Verification Document - USFunded',
    html,
  });
}

/**
 * 4. Send Loan Approved Notification
 */
async function sendLoanApproved({ email, name, loanAmount, durationMonths, interestRate, monthlyPayment, dashboardUrl }) {
  const html = templates.loanApprovedTemplate({
    name,
    loanAmount,
    durationMonths,
    interestRate,
    monthlyPayment,
    dashboardUrl,
  });
  return sendMail({
    to: email,
    subject: 'Congratulations! Your Loan Application Has Been Approved - USFunded',
    html,
  });
}

/**
 * 5. Send Loan Rejected Notification
 */
async function sendLoanRejected({ email, name, reason, supportUrl }) {
  const html = templates.loanRejectedTemplate({ name, reason, supportUrl });
  return sendMail({
    to: email,
    subject: 'Update Regarding Your Student Loan Application - USFunded',
    html,
  });
}

/**
 * 6. Send Payment Confirmation Receipt
 */
async function sendPaymentReceipt({ email, name, purpose, amount, reference, date, receiptUrl }) {
  const html = templates.paymentReceiptTemplate({
    name,
    purpose,
    amount,
    reference,
    date,
    receiptUrl,
  });
  const subject = purpose === 'application_fee'
    ? 'Payment Receipt: Application Fee Confirmed - USFunded'
    : 'Payment Receipt: Loan EMI Repayment Confirmed - USFunded';
  return sendMail({
    to: email,
    subject,
    html,
  });
}

/**
 * 7. Send Welcome Email
 */
async function sendWelcomeEmail({ email, name, dashboardUrl }) {
  const html = templates.welcomeTemplate({ name, dashboardUrl });
  return sendMail({
    to: email,
    subject: 'Welcome to USFunded - Higher Education Financing',
    html,
  });
}

module.exports = {
  sendMail,
  sendVerificationRequest,
  sendVerificationApproved,
  sendVerificationRejected,
  sendLoanApproved,
  sendLoanRejected,
  sendPaymentReceipt,
  sendWelcomeEmail,
  templates,
};
