'use client';

import { useEffect } from 'react';
import Hero from '@/components/landing/Hero';
import Bento from '@/components/landing/Bento';
import CalcSection from '@/components/landing/CalcSection';
import HowItWorks from '@/components/landing/HowItWorks';
import Testimonials from '@/components/landing/Testimonials';
import FaqSection from '@/components/landing/FaqSection';

export default function Home() {
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
    return () => clearTimeout(t);
  }, []);

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