'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  count?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('hfa_token');
      setToken(savedToken);
    }
  }, []);

  // Fetch unread notification counts
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${apiBase}/notifications?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data || [];
          setUnreadCount(list.filter((n: any) => !n.is_read).length);
        }
      } catch (err) {
        console.warn('Failed to fetch unread notification count:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle click outside profile menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Determine active main portal path based on role
  let homePath = '/dashboard';
  if (user?.role === 'startup') homePath = '/startup';
  else if (user?.role === 'mentor') homePath = '/mentor';
  else if (user?.role === 'admin') homePath = '/admin';
  else if (user?.role === 'investor') {
    const type = user.investor_profile?.investor_type;
    if (type === 'government') homePath = '/government';
    else if (type === 'corporate') homePath = '/corporate';
    else homePath = '/investor';
  }

  // Side navigation menu items based on role
  const getNavItems = (): NavItem[] => {
    if (user?.role === 'admin') {
      return [
        { label: 'Admin Hub', path: '/admin', icon: '🏛️' },
        { label: 'System Health', path: '/admin/health', icon: '🩺' },
        { label: 'System Activity', path: '/admin/activity', icon: '📈' },
        { label: 'User Directory', path: '/admin/users', icon: '👥' },
        { label: 'Notifications', path: '/dashboard/notifications', icon: '🔔', count: unreadCount },
        { label: 'Ecosystem Chat', path: '/dashboard/messages', icon: '💬' },
      ];
    }

    const items: NavItem[] = [
      { label: 'Ecosystem Portal', path: homePath, icon: '🏠' },
    ];

    if (user?.role === 'startup') {
      items.push(
        { label: 'Founder OS Workspace', path: '/dashboard/workspace', icon: '💼' },
        { label: 'AI Document Studio', path: '/dashboard/workspace/documents', icon: '📝' },
        { label: 'Match Opportunities', path: '/dashboard/matching', icon: '🎯' },
        { label: 'AI Investor Matches', path: '/matching', icon: '🤖' },
        { label: 'Grants Application', path: '/grants', icon: '🏆' }
      );
    } else if (user?.role === 'investor') {
      items.push(
        { label: 'Ecosystem Analytics', path: homePath, icon: '📊' },
        { label: 'AI Matchmaking', path: '/matching', icon: '🤖' }
      );
    } else if (user?.role === 'mentor') {
      items.push(
        { label: 'Mentorship Bookings', path: homePath, icon: '📅' }
      );
    }

    items.push(
      { label: 'B2B Marketplace', path: '/marketplace', icon: '🛒' },
      { label: 'E-Learning Hub', path: '/elearning', icon: '🎓' },
      { label: 'Ecosystem Chat', path: '/dashboard/messages', icon: '💬' },
      { label: 'Notifications', path: '/dashboard/notifications', icon: '🔔', count: unreadCount },
      { label: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
    );

    return items;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      
      {/* ===== SIDEBAR NAVIGATION (Desktop) ===== */}
      <aside style={{
        width: '280px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100,
        transform: 'translateX(0)',
        transition: 'transform var(--transition-normal)',
      }} className="desktop-sidebar">
        
        {/* Sidebar Header Brand */}
        <div style={{ height: '70px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <Link href={homePath} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>AFRICA</span>
          </Link>
        </div>

        {/* Sidebar Navigation Items */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
                className="nav-link-hover"
              >
                <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px' }}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div style={{ padding: '24px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', color: 'var(--brand-green)'
            }}>
              {user?.first_name?.charAt(0) || 'U'}{user?.last_name?.charAt(0) || ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.first_name} {user?.last_name}
              </h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', justifyContent: 'center', borderRadius: '8px' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MOBILE SIDEBAR DRAWER ===== */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          {/* Backdrop */}
          <div 
            onClick={() => setMobileOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} 
          />
          {/* Drawer Panel */}
          <aside style={{
            width: '280px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1001,
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            <div style={{ height: '70px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
              </span>
              <button 
                onClick={() => setMobileOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>
            
            <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px' }}>
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div style={{ padding: '24px 16px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', justifyContent: 'center', borderRadius: '8px' }}
              >
                🚪 Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== MAIN CONTENT WRAPPER ===== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: '280px' }} className="main-content-area">
        
        {/* Top Header Bar */}
        <header style={{
          height: '70px',
          backgroundColor: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }} className="dashboard-header-top">
          
          {/* Left Controls (Mobile Menu Toggle) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setMobileOpen(true)}
              className="mobile-hamburger-btn"
              style={{
                background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
                color: 'white', display: 'none'
              }}
            >
              ☰
            </button>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span className="badge badge-green" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                {user?.role?.replace('_', ' ')} Portal
              </span>
            </div>
          </div>

          {/* Right Controls (Notification Bell & Profile Menu) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Messages Quicklink */}
            <Link 
              href="/dashboard/messages" 
              style={{
                position: 'relative', width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
              }}
              title="Chat Messages"
            >
              💬
            </Link>

            {/* Notifications Bell */}
            <Link 
              href="/dashboard/notifications" 
              style={{
                position: 'relative', width: '38px', height: '38px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px',
                  borderRadius: '50%', backgroundColor: '#ef4444'
                }} />
              )}
            </Link>

            {/* Profile Dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '4px'
                }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', color: 'var(--brand-green)'
                }}>
                  {user?.first_name?.charAt(0) || 'U'}{user?.last_name?.charAt(0) || ''}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }} className="desktop-username">
                  ▼
                </span>
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', right: 0, marginTop: '8px', width: '220px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', boxShadow: 'var(--shadow-md)', padding: '8px',
                  display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 100
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.first_name} {user?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  </div>
                  <Link 
                    href="/dashboard/profile"
                    onClick={() => setProfileOpen(false)}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    className="dropdown-item-hover"
                  >
                    👤 My Profile
                  </Link>
                  <Link 
                    href="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    className="dropdown-item-hover"
                  >
                    ⚙️ Account Settings
                  </Link>
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    style={{ 
                      padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', 
                      alignItems: 'center', gap: '8px', color: '#ef4444', textAlign: 'left', width: '100%',
                      cursor: 'pointer'
                    }}
                    className="dropdown-item-hover"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div style={{ flex: 1, padding: '40px', paddingBottom: '80px' }} className="inner-dashboard-content">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(18, 18, 18, 0.96)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-color)', zIndex: 50,
        padding: '8px 0', paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[
            { icon: '🏠', label: 'Home', path: homePath },
            { icon: '💬', label: 'Chat', path: '/dashboard/messages' },
            { icon: '🔔', label: 'Alerts', path: '/dashboard/notifications', badge: unreadCount },
            { icon: '🛒', label: 'Market', path: '/marketplace' },
            { icon: '⚙️', label: 'Settings', path: '/dashboard/settings' },
          ].map(item => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '6px 12px', borderRadius: '8px', position: 'relative',
                  color: isActive ? 'var(--brand-green)' : 'var(--text-muted)',
                  transition: 'color 0.2s', textDecoration: 'none', minWidth: '52px',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 400, letterSpacing: '0.02em' }}>
                  {item.label}
                </span>
                {(item.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '8px',
                    backgroundColor: '#ef4444', color: 'white',
                    borderRadius: '99px', fontSize: '0.55rem', padding: '1px 4px',
                    fontWeight: 700, lineHeight: 1.4,
                  }}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx global>{`
        .nav-link-hover:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
          color: white !important;
        }
        .dropdown-item-hover:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 1024px) {
          .desktop-sidebar {
            transform: translateX(-100%) !important;
            display: none !important;
          }
          .main-content-area {
            padding-left: 0 !important;
          }
          .mobile-hamburger-btn {
            display: block !important;
          }
          .desktop-username {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .inner-dashboard-content {
            padding: 20px !important;
            padding-bottom: 88px !important;
          }
          .dashboard-header-top {
            padding: 0 20px !important;
          }
        }
        @media (max-width: 1024px) {
          .mobile-bottom-nav {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
