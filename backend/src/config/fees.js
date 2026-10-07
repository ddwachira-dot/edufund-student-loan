// Application-fee policy shared across payment + loan routes.
const APPLICATION_FEE = 10;

// Marker note for applications auto-rejected when the student cancels the fee checkout.
// Confirming the fee later restores only applications carrying this exact note.
const FEE_CANCEL_NOTE = 'Application fee payment was cancelled by the student.';

// Whether a student may still pay the fee for this application: it has not been
// paid yet AND it is either awaiting review or was auto-rejected by a cancelled
// checkout (an admin rejection is NOT payable).
function canPayFee(loan = {}) {
  if (loan.application_fee_paid) return false;
  return loan.status === 'pending' || loan.decision_note === FEE_CANCEL_NOTE;
}

module.exports = { APPLICATION_FEE, FEE_CANCEL_NOTE, canPayFee };