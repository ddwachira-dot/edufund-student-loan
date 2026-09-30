import { useEffect, useRef, useState } from 'react';
import { Reveal } from '../../hooks/useReveal';

const testimonials = [
  { name: 'Amara O.', school: 'University of Michigan', quote: 'Applied on a Sunday night, verified by Wednesday, and the money hit my bank account before rent was due.' },
  { name: 'Diego R.', school: 'UT Austin', quote: 'The calculator is no lie — my actual monthly payment matched the estimate to the cent.' },
  { name: 'Priya S.', school: 'Georgia Tech', quote: 'Every step is transparent. I always knew exactly where my application was in the pipeline.' },
  { name: 'Marcus T.', school: 'Rutgers', quote: 'No hidden fees anywhere. The $10 fee was the only thing I ever paid beyond my loan itself.' },
  { name: 'Yuki H.', school: 'UCLA', quote: 'Picked my own repayment term and watched my exact schedule on screen before signing. So refreshing.' },
  { name: 'Sofia L.', school: 'UNC Chapel Hill', quote: 'Got my funds through AirTM when my bank account was still being set up. They really care.' },
];

const STEP = 380;

export default function Testimonials() {
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);
  const posRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = posRef.current + STEP;
      if (next >= testimonials.length * STEP) {
        posRef.current = 0;
        setAnimate(false);
        setOffset(0);
      } else {
        posRef.current = next;
        setAnimate(true);
        setOffset(next);
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="testimonials" className="section" aria-label="Student stories">
      <Reveal className="section-head">
        <span className="kicker">Testimonials</span>
        <h2 className="display">Loved by students across the country</h2>
        <p>Real quotes from borrowers who used FundEd to fund their school year.</p>
      </Reveal>

      <div className="marquee" aria-label="Student testimonials scroll">
        <div
          className="marquee-track"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: animate ? 'transform 0.6s ease' : 'transform 0.01s linear',
          }}
        >
          {[...testimonials, ...testimonials].map((c, i) => (
            <figure className="testimonial" key={`${c.name}-${i}`} aria-hidden={i >= testimonials.length}>
              <blockquote className="q">“{c.quote}”</blockquote>
              <figcaption className="who">
                <span className="avatar" aria-hidden="true">{c.name.charAt(0)}</span>
                <span style={{ flex: 1 }}>
                  <strong>{c.name}</strong>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.school}</span>
                </span>
                <span aria-label="5 out of 5 stars" style={{ color: '#f59e0b', fontSize: 13 }}>★★★★★</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}