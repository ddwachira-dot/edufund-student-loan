import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/landing/Hero';
import Bento from '../components/landing/Bento';
import CalcSection from '../components/landing/CalcSection';
import HowItWorks from '../components/landing/HowItWorks';
import Testimonials from '../components/landing/Testimonials';
import FaqSection from '../components/landing/FaqSection';

export default function Home() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    // delay to allow DOM paint before scrolling
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <>
      <Hero />
      <Bento />
      <CalcSection />
      <HowItWorks />
      <Testimonials />
      <FaqSection />
    </>
  );
}