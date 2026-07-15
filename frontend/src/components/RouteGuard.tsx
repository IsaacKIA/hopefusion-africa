'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useMounted } from '../hooks/useMounted';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('startup' | 'investor' | 'mentor' | 'admin' | 'government' | 'corporate' | 'student' | 'service_provider')[];
}

function GuardMessage({ message, subtext, showRetry, onRetry, onLogin }: {
  message: string;
  subtext?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  onLogin?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)', gap: '12px',
    }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'center', maxWidth: '280px' }}>
        {message}
      </p>
      {subtext && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', maxWidth: '280px' }}>
          {subtext}
        </p>
      )}
      {showRetry && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          {onRetry && (
            <button onClick={onRetry} style={{
              padding: '8px 16px', fontSize: '0.8rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}>🔄 Retry</button>
          )}
          {onLogin && (
            <button onClick={onLogin} style={{
              padding: '8px 16px', fontSize: '0.8rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}>🔑 Sign In</button>
          )}
        </div>
      )}
    </div>
  );
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
    const isAuthorized = mounted && !loading && user && user.is_verified &&
      (user.onboarding_completed || pathname.includes('/welcome') || pathname.includes('/onboard')) &&
      (!allowedRoles || allowedRoles.includes(user.role));
    if (!isAuthorized) {
      const timer = setTimeout(() => setShowRetry(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [mounted, loading, user, pathname, allowedRoles]);

  // Differentiated guard states
  if (!mounted || loading) {
    return <GuardMessage message="Checking your session…" />;
  }

  if (!user) {
    return <GuardMessage
      message="Redirecting to login…"
      subtext="You need to sign in to access this page."
      showRetry={showRetry}
      onLogin={() => router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)}
    />;
  }

  if (!user.is_verified) {
    return <GuardMessage
      message="Email verification required"
      subtext="Redirecting you to verify your account…"
      showRetry={showRetry}
      onRetry={() => router.replace('/verify')}
    />;
  }

  if (!user.onboarding_completed && !pathname.includes('/welcome') && !pathname.includes('/onboard')) {
    return <GuardMessage
      message="Complete your profile to continue"
      subtext="Redirecting to your welcome page…"
      showRetry={showRetry}
      onRetry={() => router.replace('/welcome')}
    />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <GuardMessage
      message="Access restricted"
      subtext={`This area requires: ${allowedRoles.join(' or ')}.`}
      showRetry={showRetry}
      onRetry={() => router.replace('/dashboard')}
    />;
  }

  return <>{children}</>;
}
export default RouteGuard;
