'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useMounted } from '../hooks/useMounted';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('startup' | 'investor' | 'mentor' | 'admin' | 'government' | 'corporate' | 'student' | 'service_provider')[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (mounted && !loading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!user.is_verified) {
        router.replace('/verify');
      } else if (!user.onboarding_completed && !pathname.includes('/welcome') && !pathname.includes('/onboard')) {
        router.replace('/welcome');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace('/dashboard?access=denied');
      }
    }
  }, [user, loading, pathname, router, allowedRoles, mounted]);

  useEffect(() => {
    if (!mounted || loading || !user || !user.is_verified || (!user.onboarding_completed && !pathname.includes('/welcome') && !pathname.includes('/onboard'))) {
      const timer = setTimeout(() => setShowRetry(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [mounted, loading, user, pathname]);

  if (!mounted || loading || !user || !user.is_verified || (!user.onboarding_completed && !pathname.includes('/welcome') && !pathname.includes('/onboard')) || (allowedRoles && !allowedRoles.includes(user.role))) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        gap: '16px',
      }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
          Verifying authorization security check…
        </p>
        {showRetry && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🔄 Retry
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('hfa_user');
                router.replace('/login');
              }} 
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🔑 Return to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
export default RouteGuard;
