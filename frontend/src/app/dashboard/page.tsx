'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import RouteGuard from '../../components/RouteGuard';

function DashboardRouterContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [statusText, setStatusText] = useState('Checking Account...');
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (user) {
      const roleRedirectMap = {
        startup: '/startup',
        investor: '/investor',
        mentor: '/mentor',
        admin: '/admin',
        government: '/investor',
        corporate: '/investor'
      };
      
      const targetPath = roleRedirectMap[user.role as keyof typeof roleRedirectMap] || '/';
      router.replace(targetPath);
    }
  }, [user, router]);

  useEffect(() => {
    const timer1 = setTimeout(() => setStatusText('Loading Workspace...'), 800);
    const timer2 = setTimeout(() => setStatusText('Preparing Dashboard...'), 1600);
    const timer3 = setTimeout(() => setStatusText('Almost Ready...'), 2400);
    const timer4 = setTimeout(() => setShowRetry(true), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      gap: '16px'
    }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}>
        {statusText}
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
            onClick={() => router.push('/')} 
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
            🏠 Go Home
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardRouterPage() {
  return (
    <RouteGuard>
      <DashboardRouterContent />
    </RouteGuard>
  );
}
