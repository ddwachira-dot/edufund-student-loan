import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sl_user') || 'null');
    } catch {
      return null;
    }
  });
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    setFirebaseUser(cred.user);
    const token = await cred.user.getIdToken();
    localStorage.setItem('sl_token', token);

    // Sync profile and permissions with backend
    try {
      const { data } = await api.post(
        '/auth/firebase-login',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem('sl_token', data.token);
      localStorage.setItem('sl_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      await signOut(auth);
      setFirebaseUser(null);
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      throw err;
    }
  };

  const register = async (payload) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
    setFirebaseUser(cred.user);
    const token = await cred.user.getIdToken();
    localStorage.setItem('sl_token', token);

    // Send email verification in the background
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.warn('sendEmailVerification notice:', err);
    }

    try {
      const { data } = await api.post(
        '/auth/firebase-register',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem('sl_token', data.token);
      localStorage.setItem('sl_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      await signOut(auth);
      setFirebaseUser(null);
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      throw err;
    }
  };

  const forgotPassword = async (email) => {
    return sendPasswordResetEmail(auth, email.trim());
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }
    throw new Error('No user is currently signed in');
  };

  const reloadFirebaseUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser });
      return auth.currentUser;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_) {
      // ignore
    }
    setFirebaseUser(null);
    localStorage.removeItem('sl_token');
    localStorage.removeItem('sl_user');
    sessionStorage.removeItem('sl_welcome_pending');
    setUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          localStorage.setItem('sl_token', token);
          const { data } = await api.get('/auth/me');
          setUser(data.user);
          localStorage.setItem('sl_user', JSON.stringify(data.user));
        } catch (err) {
          if (err.response?.status === 403 || err.response?.status === 401) {
            localStorage.removeItem('sl_token');
            localStorage.removeItem('sl_user');
            setUser(null);
          }
        }
      } else {
        const legacyToken = localStorage.getItem('sl_token');
        if (legacyToken) {
          try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
          } catch {
            localStorage.removeItem('sl_token');
            localStorage.removeItem('sl_user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        firebaseUser,
        reloadFirebaseUser,
        login,
        register,
        forgotPassword,
        sendVerification,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}