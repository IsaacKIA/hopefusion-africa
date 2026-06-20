'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { HFAApi } from '../../lib/api';

export default function WelcomePage() {
  const { user } = useAuth();
  const router = useRouter();
  // Use data directly from AuthContext — no extra API call needed
  const passport = user;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleStartOnboarding = () => {
    router.push('/onboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(45, 181, 98, 0.08) 0%, transparent 40%)',
      padding: '40px 24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '48px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
      }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>
          Passport Created
        </span>
        
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '8px', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
          Welcome, {user?.first_name}!
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '40px', lineHeight: '24px' }}>
          Your global digital identity is active. We&apos;ve initialized your{' '}
          <strong style={{ color: 'white' }}>HopeFusion Startup Passport</strong>{' '}
          to track ecosystem alignment and funding readiness.
        </p>

        {/* Passport Dashboard Mock Card */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '28px',
          textAlign: 'left',
          marginBottom: '40px',
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Ecosystem Credentials</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(45, 181, 98, 0.15)', color: 'var(--brand-green)', fontWeight: 600 }}>
              {passport?.verification_status || 'Verified'}
            </span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                HopeScore™ Trust
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-green)' }}>
                {passport?.hope_score || 300}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Profile Completion
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                {passport?.profile_completion || 10}%
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Next Recommended Action
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              Complete Progressive Profile Setup
            </div>
          </div>
        </div>

        <button
          onClick={handleStartOnboarding}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1rem', fontWeight: 700 }}
        >
          Configure Ecosystem Onboarding
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginTop: '16px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Skip and explore dashboard
        </button>
      </div>
    </div>
  );
}
