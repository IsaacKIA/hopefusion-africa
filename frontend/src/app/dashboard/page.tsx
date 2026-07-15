'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Suspense } from 'react';

const ROLE_PATHS: Record<string, string> = {
  startup: '/startup',
  investor: '/investor',
  mentor: '/mentor',
  admin: '/admin',
  government: '/government',
  corporate: '/corporate',
  student: '/student',
  service_provider: '/service-provider',
};

function DashboardRedirect() {
  const { user, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle Google OAuth token from redirect (C-3 fix)
    const oauthToken = searchParams.get('token');
    const oauthRole = searchParams.get('role');
    const oauthStatus = searchParams.get('oauth');

    if (oauthStatus === 'success' && oauthToken) {
      // Store token from OAuth redirect
      if (typeof window !== 'undefined') {
        localStorage.setItem('hfa_token', oauthToken);
        if (oauthRole) {
          // Refresh profile to get full user object
          refreshProfile().then(() => {
            const dest = ROLE_PATHS[oauthRole] || '/startup';
            router.replace(dest);
          }).catch(() => router.replace('/startup'));
        }
      }
      return;
    }

    if (oauthStatus === 'failure') {
      router.replace('/login?oauth=failure');
      return;
    }

    if (loading) return;

    if (!user) {
      router.replace('/login?redirect=/dashboard');
      return;
    }
    if (!user.is_verified) {
      router.replace('/verify');
      return;
    }
    if (!user.onboarding_completed) {
      router.replace('/welcome');
      return;
    }

    const dest = ROLE_PATHS[user.role] || '/startup';
    router.replace(dest);
  }, [user, loading, router, searchParams, refreshProfile]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      gap: '16px',
    }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Loading your dashboard…
      </p>
    </div>
  );
}

export default function DashboardRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    }>
      <DashboardRedirect />
    </Suspense>
  );
}
