'use client';

import React, { useState, useEffect, useRef } from 'react';
import RouteGuard from '../../../components/RouteGuard';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { HFAApi, API } from '../../../lib/api';

interface Thread {
  id: string;
  participant_name: string;
  participant_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  avatar_initials: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  is_mine: boolean;
}

const MOCK_THREADS: Thread[] = [
  { id: 't1', participant_name: 'David Otieno', participant_role: 'Investor · Nairobi Capital Partners', last_message: 'That deck looks solid. Can we schedule a call this week?', last_message_at: '2026-07-15T17:30:00Z', unread_count: 2, avatar_initials: 'DO' },
  { id: 't2', participant_name: 'Dr. Amara Diallo', participant_role: 'Mentor · Former McKinsey', last_message: 'Great session! Sending you the resource doc now.', last_message_at: '2026-07-15T14:10:00Z', unread_count: 0, avatar_initials: 'AD' },
  { id: 't3', participant_name: 'Naledi Dlamini', participant_role: 'Startup · FinFlow ZA', last_message: 'Would love to explore partnership opportunities.', last_message_at: '2026-07-14T09:55:00Z', unread_count: 1, avatar_initials: 'ND' },
  { id: 't4', participant_name: 'Ibrahim Yusuf', participant_role: 'Service Provider · LegalEase Africa', last_message: 'The incorporation documents are ready for signature.', last_message_at: '2026-07-13T16:22:00Z', unread_count: 0, avatar_initials: 'IY' },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  t1: [
    { id: 'm1', sender_id: 'other', body: 'Hi! I came across your startup through the HopeFusion platform. Very impressive traction numbers.', created_at: '2026-07-15T16:00:00Z', is_mine: false },
    { id: 'm2', sender_id: 'me', body: 'Thank you! We\'ve been focused on our Kenyan expansion and the metrics have been strong.', created_at: '2026-07-15T16:15:00Z', is_mine: true },
    { id: 'm3', sender_id: 'other', body: 'That deck looks solid. Can we schedule a call this week?', created_at: '2026-07-15T17:30:00Z', is_mine: false },
  ],
  t2: [
    { id: 'm1', sender_id: 'other', body: 'Your business model is on the right track. Focus on unit economics before Series A.', created_at: '2026-07-15T13:00:00Z', is_mine: false },
    { id: 'm2', sender_id: 'me', body: 'Thank you so much for the clarity. That\'s exactly what we needed to hear.', created_at: '2026-07-15T13:30:00Z', is_mine: true },
    { id: 'm3', sender_id: 'other', body: 'Great session! Sending you the resource doc now.', created_at: '2026-07-15T14:10:00Z', is_mine: false },
  ],
  t3: [
    { id: 'm1', sender_id: 'other', body: 'Would love to explore partnership opportunities.', created_at: '2026-07-14T09:55:00Z', is_mine: false },
  ],
  t4: [
    { id: 'm1', sender_id: 'other', body: 'The incorporation documents are ready for signature.', created_at: '2026-07-13T16:22:00Z', is_mine: false },
  ],
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MessagesContent() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load real threads from API
  useEffect(() => {
    setLoadingThreads(true);
    HFAApi.loadThreads()
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          const mapped: Thread[] = res.data.map((t: any) => ({
            id: t.thread_id || t.id,
            participant_name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown',
            participant_role: t.role || '',
            last_message: t.content || '',
            last_message_at: t.created_at || new Date().toISOString(),
            unread_count: parseInt(t.unread) || 0,
            avatar_initials: `${(t.first_name || 'U')[0]}${(t.last_name || '')[0] || ''}`.toUpperCase(),
          }));
          setThreads(mapped);
        }
      })
      .catch(() => setThreadError('Could not load conversations.'))
      .finally(() => setLoadingThreads(false));
  }, []);

  // Load messages for selected thread
  useEffect(() => {
    if (!activeThread || !user) return;
    setLoadingMessages(true);
    API.get(`/messages/thread/${activeThread.id}`)
      .then((res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          setMessages(res.data.map((m: any) => ({
            id: m.id,
            sender_id: m.sender_id,
            body: m.content,
            created_at: m.created_at,
            is_mine: m.sender_id === user.id,
          })));
        } else {
          setMessages([]);
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
    // Mark thread as read
    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, unread_count: 0 } : t));
  }, [activeThread, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread || sending) return;
    const body = newMessage.trim();
    setSending(true);
    // Optimistic update
    const optimistic: Message = { id: `tmp-${Date.now()}`, sender_id: user?.id || 'me', body, created_at: new Date().toISOString(), is_mine: true };
    setMessages(prev => [...prev, optimistic]);
    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, last_message: body, last_message_at: new Date().toISOString() } : t));
    setNewMessage('');
    try {
      await API.post('/messages', { recipient_id: activeThread.id, content: body, thread_id: activeThread.id });
    } catch { /* optimistic already applied */ }
    finally { setSending(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>Ecosystem Chat</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Direct messages with investors, mentors, and partners from across the ecosystem.</p>
      </div>

      {threadError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>
          {threadError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }} className="messages-grid">
        {/* Thread List */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <input type="text" className="form-input" placeholder="🔍  Search conversations..." style={{ padding: '8px 12px', fontSize: '0.82rem' }} />
          </div>
          {loadingThreads ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.8rem' }}>Loading conversations…</p>
            </div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
              <p style={{ fontSize: '0.82rem' }}>No conversations yet.</p>
              <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>Connect with investors and mentors to start chatting.</p>
            </div>
          ) : threads.map(thread => (
            <div
              key={thread.id}
              onClick={() => setActiveThread(thread)}
              style={{
                padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'flex-start',
                backgroundColor: activeThread?.id === thread.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderLeft: activeThread?.id === thread.id ? '3px solid var(--brand-green)' : '3px solid transparent',
                transition: 'all 0.15s',

              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(45, 181, 98, 0.15)', border: '1px solid rgba(45, 181, 98, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: 'var(--brand-green)', flexShrink: 0 }}>
                {thread.avatar_initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.participant_name}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>{timeAgo(thread.last_message_at)}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.participant_role}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{thread.last_message}</span>
                  {thread.unread_count > 0 && (
                    <span style={{ backgroundColor: 'var(--brand-green)', color: '#000', borderRadius: '99px', fontSize: '0.65rem', padding: '1px 6px', fontWeight: 700, marginLeft: '8px', flexShrink: 0 }}>{thread.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message View */}
        {activeThread ? (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.01)' }}>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(45, 181, 98, 0.15)', border: '1px solid rgba(45, 181, 98, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--brand-green)' }}>
                {activeThread.avatar_initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activeThread.participant_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{activeThread.participant_role}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
              {loadingMessages ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <div className="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.85rem' }}>No messages yet. Say hello! 👋</p>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.is_mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '68%', padding: '12px 16px', borderRadius: msg.is_mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: msg.is_mine ? 'rgba(45, 181, 98, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: msg.is_mine ? '1px solid rgba(45, 181, 98, 0.2)' : '1px solid var(--border-color)',
                    fontSize: '0.85rem', lineHeight: 1.5,
                  }}>
                    <p style={{ marginBottom: '4px' }}>{msg.body}</p>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: msg.is_mine ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <form onSubmit={handleSend} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', backgroundColor: 'var(--bg-secondary)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type your message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                disabled={sending}
                style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn-primary" disabled={!newMessage.trim() || sending} style={{ padding: '10px 20px', fontSize: '0.85rem', flexShrink: 0 }}>
                {sending ? '...' : 'Send ➤'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem' }}>💬</div>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit' }}>Select a conversation</h3>
            <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '280px' }}>Choose a thread from the left to start messaging with ecosystem partners.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .messages-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <MessagesContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
