'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HFAApi, API } from '../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function VerifyPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    // Redirect if not logged in or already verified
    if (!user) {
      router.replace('/login');
    } else if (user.is_verified) {
      router.replace('/welcome');
    }
  }, [user, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      e.preventDefault();
      const digits = pastedData.split('');
      setCode(digits);
      handleSubmit(pastedData);
    }
  };

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // Allow numbers only
    
    const newCode = [...code];
    newCode[index] = val.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all fields are populated
    if (newCode.every(num => num !== '') && newCode.length === 6) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (verificationCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await HFAApi.verifyEmail(verificationCode);
      if (res?.success) {
        await refreshProfile();
        router.replace('/welcome');
      } else {
        setError(res?.message || 'Verification failed. Try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setResendStatus('Sending code...');
    try {
      await API.post('/auth/resend');
      setResendTimer(60);
      setResendStatus('A new verification code has been sent.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
      setResendStatus(null);
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
        maxWidth: '440px',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, display: 'inline-flex', gap: '8px', marginBottom: '24px' }}>
            <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Security Verification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: '20px' }}>
            We sent a 6-digit OTP code to <strong style={{ color: 'white' }}>{user?.email}</strong>. Enter it below to secure and verify your account.
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
            marginBottom: '24px',
            textAlign: 'left'
          }} id="verify-error-msg">
            {error}
          </div>
        )}

        {resendStatus && (
          <div style={{
            backgroundColor: 'rgba(45, 181, 98, 0.08)',
            border: '1px solid rgba(45, 181, 98, 0.2)',
            color: 'var(--brand-green)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            {resendStatus}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          {code.map((num, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              pattern="\d*"
              maxLength={1}
              value={num}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading}
              style={{
                width: '48px',
                height: '56px',
                fontSize: '1.5rem',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: 'white',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              className="otp-input"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => handleSubmit(code.join(''))}
          className="btn-primary"
          disabled={loading || code.some(num => num === '')}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '20px' }}
        >
          {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Verify Code'}
        </button>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Didn't receive a code?{' '}
          {resendTimer > 0 ? (
            <span>Resend in {resendTimer}s</span>
          ) : (
            <button
              onClick={handleResend}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-green)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
