'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a registered email address.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('If that email exists, a password reset code has been sent.');
        if (data.debug_otp) {
          localStorage.setItem('hfa_debug_otp', data.debug_otp);
        } else {
          localStorage.removeItem('hfa_debug_otp');
        }
      } else {
        setError(data.error || 'Request failed. Please try again.');
      }
    } catch (err: any) {
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Home
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
            </span>
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Recover Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            Enter your details to receive a recovery code
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: 'rgba(45, 181, 98, 0.08)',
            border: '1px solid rgba(45, 181, 98, 0.2)',
            color: 'var(--brand-green)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px'
          }}>
            {message}
            <div style={{ marginTop: '12px' }}>
              <Link href={`/reset-password?email=${encodeURIComponent(email)}`} style={{ textDecoration: 'underline', fontWeight: 700 }}>
                Enter reset code →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. founder@mycompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--brand-green)', fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
