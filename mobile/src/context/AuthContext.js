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
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setToken(storedToken);
      }
    } catch (err) {
      console.error('Auth load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    await Promise.all([
      SecureStore.setItemAsync('hfa_token', data.token),
      SecureStore.setItemAsync('hfa_user',  JSON.stringify(data.user)),
    ]);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(payload) {
    const data = await api.post('/auth/register', payload);
    await Promise.all([
      SecureStore.setItemAsync('hfa_token', data.token),
      SecureStore.setItemAsync('hfa_user',  JSON.stringify(data.user)),
    ]);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
