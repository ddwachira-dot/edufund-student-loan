/**
 * USFunded Transactional Email Templates
 * Responsive, bulletproof HTML email layouts matching the USFunded fintech theme.
 */

const SITE_URL = process.env.FRONTEND_URL || 'https://usfunded.org';

function baseLayout({ title, preheader, badge, badgeColor = '#006994', badgeBg = '#e6f0f5', content, ctaText, ctaUrl }) {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f6f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    a { color: #006994; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-card { padding: 24px 20px !important; }
      .detail-col { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f7fb; color: #10182f;">
  <!-- Preheader text (hidden preview in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${preheader || title}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f7fb; padding: 40px 0 60px;">
    <tr>
      <td align="center">
        <!-- Main Wrapper -->
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" style="width: 580px; max-width: 580px; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${SITE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: #0a1128; padding: 8px 18px; border-radius: 6px;">
                      <span style="font-size: 19px; font-weight: 800; letter-spacing: 0.12em; color: #ffffff; text-transform: uppercase;">US<span style="color: #17a2c3;">FUNDED</span></span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Main Card Container -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border: 1px solid #e5e9f2; border-radius: 8px; padding: 36px 36px 40px; box-shadow: 0 4px 16px rgba(10, 17, 40, 0.04);">
              
              ${badge ? `
              <!-- Status Pill Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 5px 12px; border-radius: 12px; border: 1px solid ${badgeColor}33;">
                    ${badge}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Heading -->
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #0a1128; line-height: 1.25; letter-spacing: -0.01em;">
                ${title}
              </h1>

              <!-- Dynamic Body Content -->
              <div style="font-size: 15px; line-height: 1.65; color: #374151;">
                ${content}
              </div>

              ${ctaText && ctaUrl ? `
              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" style="background-color: #006994; color: #ffffff; display: inline-block; font-size: 14.5px; font-weight: 600; padding: 13px 32px; border-radius: 6px; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 2px 6px rgba(0, 105, 148, 0.25);">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Security Notice Divider -->
              <div style="border-top: 1px solid #f0f3f8; margin-top: 32px; padding-top: 20px; font-size: 12.5px; color: #6b7280; line-height: 1.5;">
                <p style="margin: 0;">
                  <strong>Security Note:</strong> USFunded representatives will never ask you for your account password or full banking secrets via email. Ensure you are visiting <code>https://usfunded.org</code>.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 28px 20px 0; font-size: 12px; color: #9aa6ba; line-height: 1.6;">
              <p style="margin: 0 0 8px;">
                USFunded &bull; Higher Education Financing &bull; Global Student Portal
              </p>
              <p style="margin: 0 0 12px;">
                Questions? Visit our <a href="${SITE_URL}/faq" style="color: #006994; text-decoration: underline;">Help Center</a> or email <a href="mailto:support@usfunded.org" style="color: #006994; text-decoration: underline;">support@usfunded.org</a>
              </p>
              <p style="margin: 0; color: #b1b9c9;">
                &copy; ${currentYear} USFunded Technologies Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Identity Verification Request / Instruction
 */
function verifyIdentityRequestTemplate({ name, verifyUrl = `${SITE_URL}/verify` }) {
  const content = `
    <p>Hello ${name || 'Student'},</p>
    <p>To ensure security and finalize your international student loan eligibility, USFunded requires you to verify your identity.</p>
    
    <div style="background-color: #f9fafb; border: 1px solid #e5e9f2; border-radius: 6px; padding: 18px; margin: 20px 0;">
      <strong style="color: #0a1128; font-size: 14px; display: block; margin-bottom: 8px;">Required Documents (One of the following):</strong>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13.5px; line-height: 1.8;">
        <li>Valid International Passport or National ID</li>
        <li>Student Visa (F-1 / J-1) or Form I-20 document</li>
        <li>Proof of University Admission / Enrollment</li>
      </ul>
    </div>

    <p>Please click the secure button below to upload your identity document directly into your dashboard.</p>
  `;

  return baseLayout({
    title: 'Verify Your Student Identity',
    preheader: 'Action required: Complete your student identity verification for USFunded.',
    badge: 'Action Required',
    badgeColor: '#006994',
    badgeBg: '#e6f0f5',
    content,
    ctaText: 'Complete Identity Verification',
    ctaUrl: verifyUrl,
  });
}

/**
 * 2. Identity Verification Approved
 */
function verificationApprovedTemplate({ name, applyUrl = `${SITE_URL}/dashboard` }) {
  const content = `
    <p>Hello ${name || 'Student'},</p>
    <p>Great news! Our administrative review team has verified and approved your student identity documents.</p>
    
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 500;">
        &check; <strong>Identity Verified:</strong> Your profile is cleared for student loan applications, fund disbursement, and payment management.
      </p>
    </div>

    <p>You can now continue to your dashboard to review your loan status or submit your application.</p>
  `;

  return baseLayout({
    title: 'Identity Verification Approved',
    preheader: 'Your USFunded student identity verification has been approved!',
    badge: 'Verified & Approved',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    content,
    ctaText: 'Go to Your Dashboard',
    ctaUrl: applyUrl,
  });
}

/**
 * 3. Identity Verification Rejected / Re-upload Required
 */
function verificationRejectedTemplate({ name, reason, reuploadUrl = `${SITE_URL}/verify` }) {
  const content = `
    <p>Hello ${name || 'Student'},</p>
    <p>During the review of your submitted identity documents, our verification team encountered an issue that requires your attention.</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
      <strong style="color: #991b1b; font-size: 13.5px; display: block; margin-bottom: 6px;">Reason for Rejection:</strong>
      <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
        ${reason || 'The uploaded document was either illegible, expired, or did not match the account details.'}
      </p>
    </div>

    <p>Don’t worry — this is easy to resolve. Please ensure your document is clearly legible, unexpired, and in high resolution, then re-upload it via the secure portal below.</p>
  `;

  return baseLayout({
    title: 'Action Required: Re-upload Identity Document',
    preheader: 'Update required on your USFunded student identity verification.',
    badge: 'Document Rejected',
    badgeColor: '#dc2626',
    badgeBg: '#fef2f2',
    content,
    ctaText: 'Re-upload Document Now',
    ctaUrl: reuploadUrl,
  });
}

/**
 * 4. Loan Application Submitted (Confirmation to Student)
 */
function loanSubmittedTemplate({ name, loanAmount, university, course, durationMonths, feePaid = false, feeAmount = 1, checkoutUrl = `${SITE_URL}/loans` }) {
  const content = `
    <p>Hello ${name || 'Borrower'},</p>
    <p>Your student loan application has been successfully submitted and is currently queued for administrative and credit review.</p>
    
    <!-- Application Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Loan Amount Applied For</span>
          <div style="font-size: 22px; font-weight: 700; color: #0a1128; margin-top: 4px;">
            $${Number(loanAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="detail-col" style="padding-bottom: 10px;">
                <span style="font-size: 12px; color: #64748b; display: block;">University / Institution</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${university || 'Higher Education Institution'}</strong>
              </td>
              <td class="detail-col" style="padding-bottom: 10px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Course / Program</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${course || 'Academic Program'}</strong>
              </td>
            </tr>
            <tr>
              <td class="detail-col" style="padding-top: 6px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Requested Term</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${durationMonths || 12} Months</strong>
              </td>
              <td class="detail-col" style="padding-top: 6px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Application Fee ($${feeAmount})</span>
                <strong style="color: ${feePaid ? '#059669' : '#d97706'}; font-size: 14.5px;">
                  ${feePaid ? '✓ Paid' : 'Pending Payment'}
                </strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${!feePaid ? `
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 13.5px; line-height: 1.5;">
        <strong>Important:</strong> Your application review begins once the $${feeAmount}.00 application fee is completed. You can complete the card checkout anytime from your dashboard.
      </p>
    </div>
    ` : ''}

    <p>You can track the live review progress of your application at any time in your dashboard.</p>
  `;

  return baseLayout({
    title: 'Loan Application Received',
    preheader: `Your application for $${Number(loanAmount || 0).toLocaleString()} USD has been received.`,
    badge: 'Application Submitted',
    badgeColor: '#006994',
    badgeBg: '#e6f0f5',
    content,
    ctaText: feePaid ? 'View Application Status' : `Pay $${feeAmount} Application Fee`,
    ctaUrl: checkoutUrl,
  });
}

/**
 * 5. Loan Application Approved
 */
function loanApprovedTemplate({ name, loanAmount, university, course, durationMonths = 36, interestRate = 8.5, monthlyPayment, dashboardUrl = `${SITE_URL}/dashboard` }) {
  const content = `
    <p>Hello ${name || 'Borrower'},</p>
    <p>We are delighted to inform you that your USFunded student loan application has been officially <strong>approved</strong>!</p>
    
    <!-- Loan Summary Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Approved Loan Amount</span>
          <div style="font-size: 22px; font-weight: 700; color: #0a1128; margin-top: 4px;">
            $${Number(loanAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${university || course ? `
            <tr>
              <td class="detail-col" style="padding-bottom: 10px;">
                <span style="font-size: 12px; color: #64748b; display: block;">University</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${university}</strong>
              </td>
              <td class="detail-col" style="padding-bottom: 10px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Course</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${course}</strong>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td class="detail-col" style="padding-top: 4px; padding-bottom: 4px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Fixed Interest Rate</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${interestRate}% p.a.</strong>
              </td>
              <td class="detail-col" style="padding-top: 4px; padding-bottom: 4px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Repayment Term</span>
                <strong style="color: #0a1128; font-size: 14.5px;">${durationMonths} Months</strong>
              </td>
            </tr>
            ${monthlyPayment ? `
            <tr>
              <td colspan="2" style="padding-top: 8px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Monthly EMI Instalment</span>
                <strong style="color: #006994; font-size: 16px;">$${Number(monthlyPayment).toFixed(2)} USD / month</strong>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p>Your complete Equated Monthly Instalment (EMI) schedule is now active. You can log in anytime to review disbursement status, download schedules, or make payments.</p>
  `;

  return baseLayout({
    title: 'Congratulations! Your Loan is Approved',
    preheader: `Your loan of $${Number(loanAmount || 0).toLocaleString()} USD has been approved.`,
    badge: 'Loan Approved',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    content,
    ctaText: 'View Loan & Repayment Schedule',
    ctaUrl: dashboardUrl,
  });
}

/**
 * 6. Loan Application Rejected
 */
function loanRejectedTemplate({ name, loanAmount, university, course, reason, supportUrl = `${SITE_URL}/loans` }) {
  const content = `
    <p>Hello ${name || 'Student'},</p>
    <p>Thank you for submitting your student loan application with USFunded. Following a careful review by our credit assessment committee, we regret to inform you that we are unable to approve your application at this time.</p>
    
    ${loanAmount || university ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin: 18px 0; font-size: 13.5px;">
      ${loanAmount ? `<div><span style="color: #64748b;">Amount Applied:</span> <strong style="color: #0a1128;">$${Number(loanAmount).toLocaleString()} USD</strong></div>` : ''}
      ${university ? `<div style="margin-top: 4px;"><span style="color: #64748b;">Institution:</span> <strong style="color: #0a1128;">${university}</strong></div>` : ''}
      ${course ? `<div style="margin-top: 4px;"><span style="color: #64748b;">Course:</span> <strong style="color: #0a1128;">${course}</strong></div>` : ''}
    </div>
    ` : ''}

    <div style="background-color: #f9fafb; border: 1px solid #e5e9f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <strong style="color: #111827; font-size: 13.5px; display: block; margin-bottom: 4px;">Assessment Feedback:</strong>
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        ${reason || 'The application did not meet the underwriting criteria for the requested amount or program.'}
      </p>
    </div>

    <p>You may review other financing options, update your qualifications, or reach out to our advisory team for further guidance.</p>
  `;

  return baseLayout({
    title: 'Decision on Your Loan Application',
    preheader: 'Update regarding your student loan application with USFunded.',
    badge: 'Application Decision',
    badgeColor: '#6b7280',
    badgeBg: '#f3f4f6',
    content,
    ctaText: 'View Application Status',
    ctaUrl: supportUrl,
  });
}

/**
 * 6. Payment Receipt / Confirmation
 */
function paymentReceiptTemplate({ name, purpose = 'Application Fee', amount, reference, date, receiptUrl = `${SITE_URL}/loans` }) {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('en-US');
  const label = purpose === 'application_fee' ? 'Application Processing Fee' : 'Loan EMI Repayment';

  const content = `
    <p>Hello ${name || 'Customer'},</p>
    <p>Thank you for your payment. Your transaction via Paystack has been successfully confirmed and recorded.</p>
    
    <!-- Receipt Breakdown -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 24px 0; font-size: 14px;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Payment Purpose</td>
        <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #0a1128; font-weight: 600;">${label}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Amount Paid</td>
        <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #006994; font-weight: 700; font-size: 16px;">
          $${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Payment Reference</td>
        <td align="right" style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #0a1128; font-family: monospace; font-size: 13px;">${reference || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; color: #64748b;">Date & Time</td>
        <td align="right" style="padding: 14px 18px; color: #0a1128;">${formattedDate}</td>
      </tr>
    </table>

    <p>Please keep this receipt for your records. Your updated loan balance and payment history are available in your portal.</p>
  `;

  return baseLayout({
    title: 'Payment Receipt Confirmed',
    preheader: `Payment of $${Number(amount || 0).toFixed(2)} USD successfully received.`,
    badge: 'Payment Confirmed',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    content,
    ctaText: 'View Payment History',
    ctaUrl: receiptUrl,
  });
}

/**
 * 7. Welcome & Onboarding
 */
function welcomeTemplate({ name, dashboardUrl = `${SITE_URL}/dashboard` }) {
  const content = `
    <p>Hello ${name || 'Student'},</p>
    <p>Welcome to <strong>USFunded</strong>! We are dedicated to providing accessible, transparent, fixed-rate financing for international and domestic students pursuing higher education in the United States.</p>
    
    <div style="background-color: #f9fafb; border: 1px solid #e5e9f2; border-radius: 6px; padding: 20px; margin: 24px 0;">
      <strong style="color: #0a1128; font-size: 14.5px; display: block; margin-bottom: 10px;">Three Simple Steps to Get Funded:</strong>
      <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13.5px; line-height: 2;">
        <li><strong>Verify Identity:</strong> Upload your passport or student visa to clear KYC.</li>
        <li><strong>Submit Application:</strong> Select your university, program, and required amount.</li>
        <li><strong>Admin Review & EMI:</strong> Get reviewed with our fixed 8.5% rate and instant schedule.</li>
      </ol>
    </div>

    <p>Get started right away by heading to your new student dashboard.</p>
  `;

  return baseLayout({
    title: 'Welcome to USFunded',
    preheader: 'Welcome to USFunded! Complete your onboarding steps to get funded.',
    badge: 'Account Created',
    badgeColor: '#006994',
    badgeBg: '#e6f0f5',
    content,
    ctaText: 'Go to Your Dashboard',
    ctaUrl: dashboardUrl,
  });
}

module.exports = {
  verifyIdentityRequestTemplate,
  verificationApprovedTemplate,
  verificationRejectedTemplate,
  loanSubmittedTemplate,
  loanApprovedTemplate,
  loanRejectedTemplate,
  paymentReceiptTemplate,
  welcomeTemplate,
};
