'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribeToPush } from '@/lib/push';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function NotificationBell({ token }: { token: string }) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]           = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permState, setPermState]     = useState<string>('default');
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  /* ── Check permission state on mount ────────────────────── */
  useEffect(() => {
    if ('Notification' in window) setPermState(Notification.permission);
    setPushEnabled(localStorage.getItem('pushEnabled') === 'true');
  }, []);

  /* ── Load notifications from backend ────────────────────── */
  useEffect(() => {
    if (!token) return;
    fetchNotifications();
  }, [token]);

  /* ── Close on outside click ──────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API}/api/v1/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: Notification[] = data.data || data || [];
      setNotifications(list);
      setUnread(list.filter((n) => !n.is_read).length);
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await fetch(`${API}/api/v1/notifications/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }

  async function enablePush() {
    const ok = await subscribeToPush(token);
    if (ok) {
      setPushEnabled(true);
      localStorage.setItem('pushEnabled', 'true');
      setPermState('granted');
    } else {
      setPermState(Notification.permission);
    }
  }

  function getIcon(type: string) {
    const icons: Record<string, string> = {
      message: '💬', call: '📞', match: '🎯',
      escrow: '💰', grant: '📋', default: '🔔',
    };
    return icons[type] || icons.default;
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className="notif-bell-btn"
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        aria-label="Notifications"
        id="notification-bell"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="notif-badge" aria-label={`${unread} unread`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Push Permission Banner */}
          {permState !== 'granted' && permState !== 'denied' && (
            <div className="notif-push-banner">
              <span>🔔 Get notified even when offline</span>
              <button className="notif-enable-btn" onClick={enablePush}>
                Enable
              </button>
            </div>
          )}
          {permState === 'denied' && (
            <div className="notif-push-banner notif-push-denied">
              ⚠️ Notifications blocked in browser settings
            </div>
          )}
          {pushEnabled && permState === 'granted' && (
            <div className="notif-push-banner notif-push-ok">
              ✅ Push notifications active
            </div>
          )}

          {/* List */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                >
                  <span className="notif-item-icon">{getIcon(n.type)}</span>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{n.title}</p>
                    {n.body && <p className="notif-item-body">{n.body}</p>}
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.is_read && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-bell-wrapper { position: relative; display: inline-flex; }

        .notif-bell-btn {
          position: relative;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e2e8f0;
          border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .notif-bell-btn:hover { background: rgba(255,255,255,0.15); transform: scale(1.05); }

        .notif-badge {
          position: absolute;
          top: -4px; right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 10px; font-weight: 700;
          border-radius: 999px;
          min-width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px;
          border: 2px solid #0a0a0a;
          animation: badge-pop 0.3s ease;
        }
        @keyframes badge-pop { from { transform: scale(0); } to { transform: scale(1); } }

        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px); right: 0;
          width: 360px;
          background: #131825;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          backdrop-filter: blur(16px);
          overflow: hidden;
          z-index: 1000;
          animation: dropdown-in 0.2s ease;
        }
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .notif-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
          font-weight: 600; font-size: 15px; color: #f1f5f9;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .notif-mark-read {
          font-size: 12px; color: #2db562; background: none;
          border: none; cursor: pointer; font-weight: 500;
          transition: opacity 0.2s;
        }
        .notif-mark-read:hover { opacity: 0.7; }

        .notif-push-banner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 20px;
          background: rgba(45,181,98,0.1);
          border-bottom: 1px solid rgba(45,181,98,0.2);
          font-size: 12px; color: #94a3b8; gap: 8px;
        }
        .notif-push-denied { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); }
        .notif-push-ok     { background: rgba(45,181,98,0.08); border-color: rgba(45,181,98,0.2); color: #2db562; }

        .notif-enable-btn {
          background: #2db562; color: #fff;
          border: none; border-radius: 6px;
          padding: 4px 12px; font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          transition: background 0.2s;
        }
        .notif-enable-btn:hover { background: #24a050; }

        .notif-list { max-height: 340px; overflow-y: auto; }
        .notif-list::-webkit-scrollbar { width: 4px; }
        .notif-list::-webkit-scrollbar-track { background: transparent; }
        .notif-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .notif-empty { padding: 32px 20px; text-align: center; color: #475569; font-size: 14px; }

        .notif-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: background 0.15s;
          cursor: default;
          position: relative;
        }
        .notif-item:hover { background: rgba(255,255,255,0.04); }
        .notif-item--unread { background: rgba(45,181,98,0.04); }

        .notif-item-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }

        .notif-item-content { flex: 1; min-width: 0; }
        .notif-item-title { font-size: 13px; font-weight: 600; color: #e2e8f0; margin: 0 0 2px; line-height: 1.4; }
        .notif-item-body  { font-size: 12px; color: #64748b; margin: 0 0 4px; line-height: 1.4;
                            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .notif-item-time  { font-size: 11px; color: #475569; }

        .notif-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #2db562; flex-shrink: 0; margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
