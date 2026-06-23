'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { API, HFAApi, UserProfile } from '../lib/api';
import { useRouter } from 'next/navigation';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Hydrate instantly from cache — no loading delay
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hfa_user');
      if (saved) {
        try { return JSON.parse(saved); } catch { localStorage.removeItem('hfa_user'); }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hfa_user');
      if (saved) return false;
    }
    return true;
  });
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Background sync — silently refresh session state without blocking UI
    HFAApi.getAuthStatus()
      .then((res) => {
        if (res?.success && res.user) {
          setUser(res.user);
          localStorage.setItem('hfa_user', JSON.stringify(res.user));

          const path = window.location.pathname;
          const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
          const isOnAuthPage = authPages.some(p => path.includes(p));

          if (!res.user.is_verified && !path.includes('/verify')) {
            router.replace('/verify');
          } else if (
            res.user.is_verified &&
            !res.user.onboarding_completed &&
            !path.includes('/onboard') &&
            !path.includes('/welcome')
          ) {
            router.replace('/welcome');
          } else if (res.user.is_verified && res.user.onboarding_completed && isOnAuthPage) {
            router.replace('/dashboard');
          }
        } else {
          // Server says no session — clear stale cache
          setUser(null);
          localStorage.removeItem('hfa_user');
        }
      })
      .catch(() => {
        // Backend offline — keep showing cached user, don't log out
        console.warn('[Auth] Could not reach server — using cached session');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const login = async (email: string, password: string) => {
    const res = await API.post('/auth/login', { email, password });
    if (res?.success) {
      localStorage.setItem('hfa_user', JSON.stringify(res.user));
      setUser(res.user);
      subscribeToPush().catch(() => {});
      
      // Verification checking
      if (!res.user.is_verified) {
        router.replace('/verify');
      } else if (!res.user.onboarding_completed) {
        router.replace('/welcome');
      }
    }
    return res;
  };

  const register = async (payload: any) => {
    const res = await API.post('/auth/register', payload);
    if (res?.success) {
      localStorage.setItem('hfa_user', JSON.stringify(res.user));
      setUser(res.user);
      if (res.debug_otp) {
        localStorage.setItem('hfa_debug_otp', res.debug_otp);
      } else {
        localStorage.removeItem('hfa_debug_otp');
      }
      subscribeToPush().catch(() => {});
      
      // Registration goes straight to verify
      router.replace('/verify');
    }
    return res;
  };

  const logout = async () => {
    try {
      await unsubscribeFromPush().catch(() => {});
      await API.post('/auth/logout', {});
    } catch (e) {}
    localStorage.removeItem('hfa_user');
    localStorage.removeItem('pushEnabled');
    setUser(null);
    router.push('/');
  };

  const refreshProfile = async () => {
    const res = await HFAApi.getProfile();
    if (res?.data) {
      setUser(res.data);
      localStorage.setItem('hfa_user', JSON.stringify(res.data));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
