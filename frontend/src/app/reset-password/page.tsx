'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('hfa_debug_otp');
      if (cached) {
        setDebugOtp(cached);
      }
    }
  }, []);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const isPasswordStrong = passwordRegex.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Password does not meet required strength rules.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword
        }),
      });
      const data = await res.json();

      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hfa_debug_otp');
        }
        router.push('/login?reset=success');
      } else {
        setError(data.error || 'Failed to reset password. Check details.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('Connection failed. Please check your network.');
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
      padding: '40px 24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Home
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, display: 'inline-flex', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Set New Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            Enter your recovery code and specify a new secure password
          </p>
        </div>

        {debugOtp && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#f59e0b',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <strong>Development Mode:</strong> Your password reset OTP is <strong style={{ color: 'white', fontFamily: 'monospace', fontSize: '1rem' }}>{debugOtp}</strong>
          </div>
        )}

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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">6-Digit Recovery Code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 123456"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div style={{ fontSize: '0.75rem', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isPasswordStrong ? 'var(--brand-green)' : '#f59e0b' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isPasswordStrong ? 'var(--brand-green)' : '#f59e0b',
                  display: 'inline-block'
                }} />
                {isPasswordStrong ? 'Strong password' : 'Must have 8+ chars, 1 uppercase, 1 lowercase & 1 number'}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="spinner" />
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
