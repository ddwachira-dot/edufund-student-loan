import { Reveal } from '../../hooks/useReveal';

const cards = [
  {
    tag: 'hl',
    cls: 'bento-lg',
    title: 'Apply in minutes, get funded your way',
    text: 'One short application, identity verification, and your funds arrive by bank, AirTM or PayPal.',
    chips: ['$10 application fee', 'No prepayment penalties', 'Avg. approval 24h'],
  },
  {
    cls: 'bento-card',
    title: 'Secure by design',
    text: 'Encrypted sessions, uploaded identity documents, and JWT-authenticated access on every request.',
  },
  {
    cls: 'bento-card bento-sm',
    title: '4.9/5',
    text: 'Loved by borrowers in all 50 states.',
  },
  {
    cls: 'bento-card',
    title: 'Flexible repayment',
    text: 'Pick 6 to 60 months. Watch your exact EMI schedule before you sign.',
  },
  {
    cls: 'bento-card bento-sm',
    title: 'No hidden fees',
    text: 'One $10 application fee. Nothing else, ever.',
  },
  {
    cls: 'bento-card bento-wide',
    title: 'One transparent rate',
    text: 'Every loan carries the same fixed 8.5% annual rate — use our calculator to estimate your exact monthly payment before you ever commit.',
  },
  {
    cls: 'bento-card',
    title: 'Paperless',
    text: 'Upload your documents in PDF, JPG or PNG. Nothing to print or mail.',
  },
  {
    cls: 'bento-card',
    title: 'Your money, your way',
    text: 'Disburse to a US bank account, AirTM wallet, or verified PayPal.',
  },
  {
    cls: 'bento-card',
    title: 'All 50 states',
    text: 'Open to students residing anywhere in the US and its territories.',
  },
  {
    cls: 'bento-card',
    title: 'Human support',
    text: 'Real people review your documents and answer your questions.',
  },
];

function BentoCard({ c, i }) {
  if (c.tag === 'hl') {
    return (
      <Reveal delay={i * 60} className={`bento-card bento-hl ${c.cls}`}>
        <h3>{c.title}</h3>
        <p>{c.text}</p>
        <div className="flex flex-wrap" style={{ marginTop: 'auto', gap: 8 }}>
          {c.chips.map((chip) => (
            <span key={chip} className="badge-float" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              {chip}
            </span>
          ))}
        </div>
      </Reveal>
    );
  }
  return (
    <Reveal delay={i * 60} className={`bento-card ${c.cls}`}>
      <h3>{c.title}</h3>
      <p>{c.text}</p>
    </Reveal>
  );
}

export default function Bento() {
  return (
    <section id="features" className="section" aria-label="Why FundEd">
      <Reveal className="section-head">
        <span className="kicker">Why FundEd</span>
        <h2 className="display">Everything a student loan should be</h2>
        <p>A calm, transparent experience — built for students, not for fine print.</p>
      </Reveal>
      <div className="bento-grid">
        {cards.map((c, i) => (
          <BentoCard key={c.title} c={c} i={i} />
        ))}
      </div>
    </section>
  );
}
