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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('hfa_token');
      const savedUser = localStorage.getItem('hfa_user');
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Async background profile refresh to capture updates
          HFAApi.getProfile()
            .then((res) => {
              if (res?.data) {
                setUser(res.data);
                localStorage.setItem('hfa_user', JSON.stringify(res.data));
              }
            })
            .catch(() => {});
        } catch (e) {
          localStorage.removeItem('hfa_token');
          localStorage.removeItem('hfa_user');
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await API.post('/auth/login', { email, password });
    if (res?.token) {
      localStorage.setItem('hfa_token', res.token);
      localStorage.setItem('hfa_user', JSON.stringify(res.user));
      setUser(res.user);
      // 🔔 Subscribe to push notifications after login
      subscribeToPush(res.token).catch(() => {});
    }
    return res;
  };

  const register = async (payload: any) => {
    const res = await API.post('/auth/register', payload);
    if (res?.token) {
      localStorage.setItem('hfa_token', res.token);
      localStorage.setItem('hfa_user', JSON.stringify(res.user));
      setUser(res.user);
      // 🔔 Subscribe to push notifications after register
      subscribeToPush(res.token).catch(() => {});
    }
    return res;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('hfa_token');
      if (token) await unsubscribeFromPush(token).catch(() => {});
      await API.post('/auth/logout', {});
    } catch (e) {}
    localStorage.removeItem('hfa_token');
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
