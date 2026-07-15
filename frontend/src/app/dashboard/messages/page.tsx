'use client';

import React, { useState, useEffect, useRef } from 'react';
import RouteGuard from '../../../components/RouteGuard';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';

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
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeThread) {
      setMessages(MOCK_MESSAGES[activeThread.id] || []);
      // Mark thread as read
      setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, unread_count: 0 } : t));
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;
    setSending(true);
    const msg: Message = { id: String(Date.now()), sender_id: 'me', body: newMessage.trim(), created_at: new Date().toISOString(), is_mine: true };
    setTimeout(() => {
      setMessages(prev => [...prev, msg]);
      setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, last_message: newMessage.trim(), last_message_at: new Date().toISOString() } : t));
      setNewMessage('');
      setSending(false);
    }, 400);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>Ecosystem Chat</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Direct messages with investors, mentors, and partners from across the ecosystem.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '0', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }} className="messages-grid">
        {/* Thread List */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <input type="text" className="form-input" placeholder="🔍  Search conversations..." style={{ padding: '8px 12px', fontSize: '0.82rem' }} />
          </div>
          {threads.map(thread => (
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
              {messages.map(msg => (
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
