require('dotenv').config();
const emailService = require('./src/services/email');

async function main() {
  console.log('Sending receipt with Resend API key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
  const res = await emailService.sendPaymentReceipt({
    email: 'eddieqte@gmail.com',
    name: 'Edwin maina',
    purpose: 'application_fee',
    amount: 1.00,
    reference: 'PS_33097F9997F46DD3A582',
    date: new Date(),
    loanAmount: 1000,
    university: 'University of Michigan',
    course: 'B.Sc Computer Science',
    durationMonths: 12,
  });
  console.log('Send result:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
