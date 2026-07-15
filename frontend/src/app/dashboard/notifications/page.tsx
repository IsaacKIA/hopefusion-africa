'use client';

import React, { useState, useEffect } from 'react';
import RouteGuard from '../../../components/RouteGuard';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';

interface Notification {
  id: string;
  type: 'match' | 'message' | 'grant' | 'escrow' | 'system' | 'call';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  match: '🎯',
  message: '💬',
  grant: '🏆',
  escrow: '💰',
  system: '🔔',
  call: '📞',
};

const TYPE_COLORS: Record<string, string> = {
  match: 'rgba(45, 181, 98, 0.1)',
  message: 'rgba(59, 130, 246, 0.1)',
  grant: 'rgba(232, 160, 32, 0.1)',
  escrow: 'rgba(232, 160, 32, 0.1)',
  system: 'rgba(255, 255, 255, 0.03)',
  call: 'rgba(139, 92, 246, 0.1)',
};

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'match', title: 'New Investor Match — 94% Score', body: 'Nairobi Capital Partners (Series A) has been matched to your startup profile based on sector and stage alignment.', is_read: false, created_at: '2026-07-15T17:00:00Z' },
  { id: '2', type: 'message', title: 'New message from David Otieno', body: '"That deck looks solid. Can we schedule a call this week?"', is_read: false, created_at: '2026-07-15T17:30:00Z' },
  { id: '3', type: 'grant', title: 'Grant Application Update', body: 'Your application to the SDG Impact Award has been shortlisted for review. Expect a decision within 7 business days.', is_read: false, created_at: '2026-07-15T12:00:00Z' },
  { id: '4', type: 'escrow', title: 'Escrow Milestone Approved', body: 'Milestone 1: Prototype Delivered has been approved. $5,000 USD has been released to your linked account.', is_read: true, created_at: '2026-07-14T10:30:00Z' },
  { id: '5', type: 'call', title: 'Mentorship Session Scheduled', body: 'Dr. Amara Diallo has confirmed your mentorship session for July 18th at 3:00 PM WAT.', is_read: true, created_at: '2026-07-14T08:00:00Z' },
  { id: '6', type: 'system', title: 'Profile Completion Reminder', body: 'Your HopeScore™ is currently at 680/1000. Complete your startup profile to unlock priority matching and grant access.', is_read: true, created_at: '2026-07-13T16:00:00Z' },
  { id: '7', type: 'match', title: 'New Opportunity Match', body: 'The African Development Bank Agritech Grant (up to $250,000 USD) matches 87% of your startup profile.', is_read: true, created_at: '2026-07-12T09:00:00Z' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('hfa_token'));
  }, []);

  // Attempt to load real notifications from backend
  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${apiBase}/notifications?limit=30`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const list: Notification[] = data.data || data || [];
          if (list.length > 0) setNotifications(list);
        }
      } catch { /* fall back to mock */ }
    };
    fetchNotifications();
  }, [token]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (token) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        await fetch(`${apiBase}/notifications/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      } catch { /* silent */ }
    }
  };

  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You are all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ padding: '8px 20px', fontSize: '0.82rem', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', backgroundColor: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent', color: filter === f ? 'white' : 'var(--text-secondary)', fontWeight: filter === f ? 600 : 400, transition: 'all 0.2s', textTransform: 'capitalize' }}
          >
            {f} {f === 'unread' && unreadCount > 0 && <span style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '99px', padding: '0 5px', fontSize: '0.65rem', marginLeft: '4px' }}>{unreadCount}</span>}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
            {filter === 'unread' ? 'You have no unread notifications at this time.' : 'Ecosystem activity will appear here as you engage with matches, mentors, and opportunities.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.map(notif => (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className="glass-panel"
              style={{
                padding: '20px 24px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                backgroundColor: !notif.is_read ? 'rgba(255,255,255,0.025)' : 'transparent',
                borderLeft: !notif.is_read ? '3px solid var(--brand-green)' : '3px solid transparent',
                transition: 'all 0.2s',
                opacity: notif.is_read ? 0.75 : 1,
              }}
            >
              {/* Icon */}
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: TYPE_COLORS[notif.type] || 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                {TYPE_ICONS[notif.type] || '🔔'}
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: notif.is_read ? 500 : 700, lineHeight: 1.3 }}>{notif.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {!notif.is_read && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--brand-green)', display: 'block', flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(notif.created_at)}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{notif.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <NotificationsContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
