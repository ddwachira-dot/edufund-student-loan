import { Reveal } from '../../hooks/useReveal';

const steps = [
  { n: '01', title: 'Create your account', text: 'Sign up with your email and set a password. It takes about 30 seconds.' },
  { n: '02', title: 'Verify your identity', text: 'Upload your US driver’s license or international passport. Reviewed by our team, usually within hours.' },
  { n: '03', title: 'Apply & pick terms', text: 'Tell us your amount and repayment window. See your exact EMI schedule and review all terms before signing.' },
  { n: '04', title: 'Get funded your way', text: 'Receive your disbursement by US bank, AirTM, or PayPal. Track every status step in your dashboard.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section" aria-label="How it works">
      <Reveal className="section-head">
        <span className="kicker">How it works</span>
        <h2 className="display">From sign-up to funding in four steps</h2>
      </Reveal>

      <div className="tl">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 90} className="tl-step">
            <span className="tl-num" aria-hidden="true">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}