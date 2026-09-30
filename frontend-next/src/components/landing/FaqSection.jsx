import { useRef, useState } from 'react';
import { Reveal } from '../../hooks/useReveal';

const faqs = [
  { q: 'Who can apply for an FundEd loan?', a: 'Any student that currently resides in the United States (including its territories), is enrolled or planning to enroll at a US school, and can verify their identity with a US driver’s license or international passport.' },
  { q: 'Is there a credit check or co-signer required?', a: 'No. FundEd does not perform a credit check and does not require a co-signer. Eligibility is based on US residency, enrollment, and successful identity verification.' },
  { q: 'How fast will I get my money?', a: 'Most applications are reviewed within 24 hours of identity approval. Once approved and you accept your loan terms, disbursement typically lands within a few business days via your chosen payout method.' },
  { q: 'How are funds disbursed?', a: 'You choose at application time: a US bank account (ACH), an AirTM wallet, or a verified PayPal account. You can track every status step in your dashboard.' },
  { q: 'What does it cost?', a: 'A single $10 application fee. Our fixed 8.5% annual interest rate is locked for the life of the loan — there are no origination or hidden fees, and no penalty for repaying early.' },
  { q: 'How is my monthly payment calculated?', a: 'Your payment uses a reducing-balance (amortized) method: EMI = borrowed amount × monthly rate, amortized across your chosen term. Our on-page calculator shows this live before you apply.' },
  { q: 'What happens after I apply?', a: 'Your application moves through clear steps: submitted, under review, approved (or declined), then signed and disbursed. You can see the exact status and any note from our team at every stage.' },
  { q: 'When do I start repaying?', a: 'Repayment begins in the month after your loan is approved, following your chosen schedule of 6 to 60 months. You will see your full EMI schedule before signing.' },
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0);
  const refs = useRef([]);

  const onToggle = (idx, e) => {
    if (e.nativeEvent.newState === 'open') {
      // close all others imperatively so they don't fire onToggle again
      refs.current.forEach((d, i) => {
        if (d && i !== idx && d.hasAttribute('open')) d.removeAttribute('open');
      });
      setOpenIdx(idx);
    } else {
      setOpenIdx(-1);
    }
  };

  return (
    <section id="faq" className="section" aria-label="Frequently asked questions">
      <Reveal className="section-head">
        <span className="kicker">FAQ</span>
        <h2 className="display">Questions, answered</h2>
        <p>Everything students ask us most — straight answers, no fine print.</p>
      </Reveal>

      <Reveal delay={80} className="faqs-two">
        {faqs.map((faq, i) => (
          <details
            key={faq.q}
            className={`faq-item${openIdx === i ? ' open' : ''}`}
            {...(i === 0 ? { open: true } : {})}
            ref={(el) => { refs.current[i] = el; }}
            onToggle={(e) => onToggle(i, e)}
          >
            <summary>{faq.q}</summary>
            <div className="faq-a">
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </Reveal>
    </section>
  );
}