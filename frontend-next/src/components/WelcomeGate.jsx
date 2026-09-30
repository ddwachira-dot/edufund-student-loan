'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeGate({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem('sl_welcome_pending') === '1';
    if (user.role === 'student' && pending) router.replace('/welcome');
    else if (user.role === 'admin' && pending && !user.welcome_seen_at) router.replace('/welcome');
  }, [user, router]);
  return children;
}