'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (adminOnly && user.role !== 'admin') router.replace('/dashboard');
  }, [loading, user, adminOnly, router]);

  if (loading) return <div className="center container">Loading…</div>;
  if (!user || (adminOnly && user.role !== 'admin')) return null;
  return children;
}