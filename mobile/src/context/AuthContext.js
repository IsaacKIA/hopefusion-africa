import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync('hfa_token'),
        SecureStore.getItemAsync('hfa_user'),
      ]);
      if (storedToken) {
        api.setToken(storedToken);
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Fresh status validation check on background app loads
        await checkStatus();
      }
    } catch (err) {
      console.error('Auth load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const data = await api.get('/auth/status');
      if (data && data.user) {
        setUser(data.user);
        await SecureStore.setItemAsync('hfa_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (err) {
      console.error('Status check failed:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized') || err.message?.includes('Forbidden')) {
        await logout();
      }
    }
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    api.setToken(data.token);
    setToken(data.token);
    await SecureStore.setItemAsync('hfa_token', data.token);
    
    // Sync full user information from status endpoint
    const freshUser = await api.get('/auth/status').then(d => d.user).catch(() => data.user);
    setUser(freshUser);
    await SecureStore.setItemAsync('hfa_user', JSON.stringify(freshUser));
    return data;
  }

  async function register(payload) {
    const data = await api.post('/auth/register', payload);
    api.setToken(data.token);
    setToken(data.token);
    await SecureStore.setItemAsync('hfa_token', data.token);
    
    // Sync full user information from status endpoint
    const freshUser = await api.get('/auth/status').then(d => d.user).catch(() => data.user);
    setUser(freshUser);
    await SecureStore.setItemAsync('hfa_user', JSON.stringify(freshUser));
    return data;
  }

  async function verifyOTP(code) {
    const data = await api.post('/auth/verify', { code });
    await checkStatus();
    return data;
  }

  async function resendOTP() {
    return await api.post('/auth/resend', {});
  }

  async function completeOnboarding(payload) {
    const data = await api.post('/auth/onboard', payload);
    await checkStatus();
    return data;
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    await Promise.all([
      SecureStore.deleteItemAsync('hfa_token'),
      SecureStore.deleteItemAsync('hfa_user'),
    ]);
    api.setToken(null);
    setToken(null);
    setUser(null);
  }

  async function updateProfile(updates) {
    await api.patch('/users/me', updates);
    const updated = { ...user, ...updates };
    setUser(updated);
    await SecureStore.setItemAsync('hfa_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updateProfile,
      checkStatus, verifyOTP, resendOTP, completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}
