'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import RouteGuard from '../../components/RouteGuard';

function DashboardRouterContent() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const roleRedirectMap = {
        startup: '/startup',
        investor: '/investor',
        mentor: '/mentor',
        admin: '/admin',
      };
      
      const targetPath = roleRedirectMap[user.role] || '/';
      router.replace(targetPath);
    }
  }, [user, router]);

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
        Routing to your role dashboard...
      </p>
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
