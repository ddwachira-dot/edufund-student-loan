import { Link } from 'react-router-dom';

const items = [
  {
    title: 'Your identity details',
    body: 'Full legal name, email, phone and address. Make sure the name on your application matches the name on your school records.',
  },
  {
    title: 'School and program info',
    body: 'The name of your US institution and the course or program you are (or will be) enrolled in.',
  },
  {
    title: 'Financial picture',
    body: 'Your monthly income and the amount you need, so we can build a repayment plan that fits.',
  },
  {
    title: 'Co-signer or contributor',
    body: 'Tell us whether a co-signer is available to support your application.',
  },
  {
    title: 'A way to pay the fee',
    body: 'The $10 application fee, paid when you submit and recorded on your account.',
  },
  {
    title: 'Supporting documents',
    body: 'ID, transcripts, or an admission letter (PDF, JPG, PNG, DOC — up to 10 MB). You can upload right after submitting.',
  },
];

export default function WhatYouNeed() {
  return (
    <div className="container">
      <h1 className="page-title">What you need before you apply</h1>
      <p className="page-sub">
        Gather these before you start so the application takes minutes, not hours.
      </p>

      <div className="card mb">
        <h2 className="about-h2">Checklist</h2>
        <div className="grid grid-2">
          {items.map((it) => (
            <div key={it.title} className="about-value">
              <span>
                <strong>{it.title}</strong>
                <br />
                <small>{it.body}</small>
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link to="/apply" className="btn">Start your application</Link>{' '}
      <Link to="/learn/how-it-works" className="btn outline">See how it works</Link>
    </div>
  );
}