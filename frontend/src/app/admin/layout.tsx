'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Overview'    },
  { href: '/admin/users',    icon: '👥', label: 'Users'       },
  { href: '/admin/health',   icon: '❤️', label: 'Health'      },
  { href: '/admin/activity', icon: '📋', label: 'Activity'    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0a0a', color:'#2db562', fontSize:18 }}>
        Verifying admin access…
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-icon">🌍</span>
          <div>
            <p className="admin-logo-title">HopeFusion</p>
            <p className="admin-logo-sub">Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`admin-nav-item ${active ? 'admin-nav-item--active' : ''}`}>
                <span className="admin-nav-icon">{icon}</span>
                <span>{label}</span>
                {active && <span className="admin-nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-badge">
            <span className="admin-user-avatar">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
            <div>
              <p className="admin-user-name">{user.first_name} {user.last_name}</p>
              <p className="admin-user-role">Administrator</p>
            </div>
          </div>
          <Link href="/dashboard" className="admin-back-btn">← Back to App</Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {children}
      </main>

      <style>{`
        .admin-shell {
          display: flex; min-height: 100vh;
          background: #080c14;
          font-family: 'Inter', sans-serif;
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          width: 240px; flex-shrink: 0;
          background: #0d1117;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column;
          padding: 24px 0;
          position: sticky; top: 0; height: 100vh;
          overflow-y: auto;
        }

        .admin-logo {
          display: flex; align-items: center; gap: 12px;
          padding: 0 20px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 16px;
        }
        .admin-logo-icon { font-size: 28px; }
        .admin-logo-title { font-size: 15px; font-weight: 700; color: #f1f5f9; margin: 0; }
        .admin-logo-sub   { font-size: 11px; color: #2db562; margin: 0; font-weight: 500; letter-spacing: .5px; }

        .admin-nav { display: flex; flex-direction: column; gap: 4px; padding: 0 12px; flex: 1; }

        .admin-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          color: #64748b; font-size: 14px; font-weight: 500;
          text-decoration: none; position: relative;
          transition: all 0.2s;
        }
        .admin-nav-item:hover { background: rgba(255,255,255,0.05); color: #cbd5e1; }
        .admin-nav-item--active { background: rgba(45,181,98,0.12); color: #2db562; }
        .admin-nav-icon { font-size: 17px; }
        .admin-nav-indicator {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 20px; background: #2db562; border-radius: 2px;
        }

        .admin-sidebar-footer { padding: 20px 16px 0; border-top: 1px solid rgba(255,255,255,0.07); margin-top: auto; }
        .admin-user-badge { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .admin-user-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #2db562, #1a7a3a);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .admin-user-name { font-size: 13px; font-weight: 600; color: #e2e8f0; margin: 0; }
        .admin-user-role { font-size: 11px; color: #2db562; margin: 0; }
        .admin-back-btn {
          display: block; text-align: center; font-size: 12px; color: #475569;
          text-decoration: none; padding: 8px;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 8px;
          transition: all 0.2s;
        }
        .admin-back-btn:hover { color: #94a3b8; border-color: rgba(255,255,255,0.15); }

        /* ── Main ── */
        .admin-main { flex: 1; padding: 32px; overflow-x: hidden; }

        @media (max-width: 768px) {
          .admin-sidebar { width: 200px; }
          .admin-main    { padding: 20px; }
        }
      `}</style>
    </div>
  );
}
