'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('sl_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(
    () => typeof window !== 'undefined' && Boolean(localStorage.getItem('sl_token'))
  );

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sl_token', data.token);
    localStorage.setItem('sl_user', JSON.stringify(data.user));
    sessionStorage.setItem('sl_welcome_pending', '1');
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('sl_token', data.token);
    localStorage.setItem('sl_user', JSON.stringify(data.user));
    sessionStorage.setItem('sl_welcome_pending', '1');
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sl_token');
    localStorage.removeItem('sl_user');
    sessionStorage.removeItem('sl_welcome_pending');
    setUser(null);
  };

  useEffect(() => {
    if (loading) {
      api
        .get('/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('sl_token');
          localStorage.removeItem('sl_user');
        })
        .finally(() => setLoading(false));
    }
  }, [loading]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}