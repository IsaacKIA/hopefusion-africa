'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLES = [
  { value: 'startup',          label: 'Startup Founder' },
  { value: 'investor',         label: 'Ecosystem Investor' },
  { value: 'mentor',           label: 'Professional Mentor' },
  { value: 'student',          label: 'Ecosystem Student' },
  { value: 'corporate',        label: 'Corporate Innovation' },
  { value: 'government',       label: 'Government Officer' },
  { value: 'service_provider', label: 'Service Provider' },
];

export default function RegisterPage() {
  const { register, user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'startup',
  });

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Pre-select role from URL param (e.g. /register?role=investor) — client-only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole && ROLES.some(r => r.value === urlRole)) {
      setFormData(prev => ({ ...prev, role: urlRole }));
    }
  }, []);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const isPasswordStrong = passwordRegex.test(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Password must be 8+ characters with uppercase, lowercase & a number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(formData);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: 'var(--bg-primary)', padding: '40px 24px',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
            </span>
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            Join the network — connect with funding, mentors, and markets
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', padding: '12px 16px', borderRadius: '8px',
            fontSize: '0.85rem', marginBottom: '24px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* First + Last name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input type="text" name="first_name" className="form-input"
                placeholder="Isaac" value={formData.first_name}
                onChange={handleChange} disabled={loading} autoComplete="given-name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input type="text" name="last_name" className="form-input"
                placeholder="Mensah" value={formData.last_name}
                onChange={handleChange} disabled={loading} autoComplete="family-name" required />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input type="email" name="email" className="form-input"
              placeholder="founder@mycompany.com" value={formData.email}
              onChange={handleChange} disabled={loading} autoComplete="email" required />
          </div>

          {/* Role */}
          <div className="form-group">
            <label className="form-label">Your Role *</label>
            <select name="role" className="form-input"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              disabled={loading}
              style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password" className="form-input"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={formData.password} onChange={handleChange}
              disabled={loading} autoComplete="new-password" required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', bottom: '10px',
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: '0.75rem', cursor: 'pointer',
              }}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Password strength */}
          {formData.password && (
            <div style={{ fontSize: '0.75rem', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isPasswordStrong ? 'var(--brand-green)' : '#f59e0b' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block',
                  backgroundColor: isPasswordStrong ? 'var(--brand-green)' : '#f59e0b',
                }} />
                {isPasswordStrong ? '✓ Strong password' : 'Need 8+ chars, uppercase, lowercase & number'}
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-green)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
