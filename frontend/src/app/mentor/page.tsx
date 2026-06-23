'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMounted } from '../../hooks/useMounted';

function MentorDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const mounted = useMounted();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await HFAApi.loadMySessions();
      if (res?.success) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch mentor sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleToggleAvailability = async () => {
    setUpdatingAvailability(true);
    try {
      // Toggle availability in local state or update in backend (simulation/optimistic update)
      setAvailability(!availability);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleStartCall = async (sessionId: string) => {
    try {
      const res = await HFAApi.updateSessionStatus(sessionId, 'live');
      if (res?.success) {
        router.push(`/mentorship/room/${sessionId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize call room.');
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await HFAApi.updateSessionStatus(sessionId, 'cancelled');
      if (res?.success) {
        alert('Session cancelled.');
        await fetchSessions();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel session.');
    }
  };

  const activeBookings = sessions.filter(s => s.status === 'scheduled' || s.status === 'live');
  const pastBookings = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }} className="fade-in">
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Outfit' }}>
            Hope<span style={{ color: 'var(--brand-green)' }}>Fusion</span>
          </span>
          <span className="badge badge-amber">Mentor Panel</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Dr. {mounted ? (user?.last_name || 'Advisor') : ''}
          </span>
          <button onClick={logout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 2rem' }}>
        
        {/* Banner Card */}
        <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.0rem', marginBottom: '8px', fontFamily: 'Outfit' }}>
              Welcome, Dr. {mounted ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() : ''}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Agricultural economist & strategic business mentor. Managing West Africa’s next scale startups.
            </p>
          </div>
          <div>
            <button 
              onClick={handleToggleAvailability}
              className={`btn-${availability ? 'primary' : 'secondary'}`}
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              disabled={updatingAvailability}
            >
              {availability ? '✓ Accepting Mentees' : '✕ Set Available'}
            </button>
          </div>
        </div>

        {/* Info Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Total Consultations
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-green)', fontFamily: 'Outfit' }}>34</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Average Rating
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-amber)', fontFamily: 'Outfit' }}>★ 4.85</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Mentees Managed
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'Outfit' }}>3</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="mentor-grid">
          
          {/* LEFT: Bookings & Sessions */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontFamily: 'Outfit' }}>
              Upcoming Scheduled Sessions
            </h2>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <div className="spinner" />
              </div>
            ) : activeBookings.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>No upcoming startup mentorship requests scheduled.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeBookings.map((session) => (
                  <div key={session.id} className="glass-panel" style={{
                    padding: '24px', borderLeft: session.status === 'live' ? '4px solid var(--brand-green)' : '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.01)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className={`badge ${session.status === 'live' ? 'badge-green glow-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                        {session.status === 'live' ? '🔴 Live now' : 'Scheduled'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(session.scheduled_at).toLocaleString()} ({session.duration_min} min)
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', fontFamily: 'Outfit' }}>{session.title}</h3>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Mentee: <strong>{session.mentee_first_name} {session.mentee_last_name}</strong>
                      {session.startup_name && (
                        <span> (Founder of <strong style={{ color: 'var(--brand-green)' }}>{session.startup_name}</strong>)</span>
                      )}
                    </p>

                    {session.agenda && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontStyle: 'italic' }}>
                        "{session.agenda}"
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleStartCall(session.id)}
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center', padding: '8px 16px', fontSize: '0.8rem' }}
                      >
                        {session.status === 'live' ? 'Join Live Room' : 'Launch Call Room'}
                      </button>
                      <button
                        onClick={() => handleCancelSession(session.id)}
                        className="btn-secondary"
                        style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 16px', fontSize: '0.8rem' }}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Past Consultations */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', fontFamily: 'Outfit' }}>
              Past Consultations
            </h2>
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <div className="spinner" />
              </div>
            ) : pastBookings.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No past records.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pastBookings.map((session) => (
                  <div key={session.id} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', opacity: 0.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>{new Date(session.scheduled_at).toLocaleDateString()}</span>
                      <span className="badge" style={{ fontSize: '0.65rem' }}>{session.status}</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', fontFamily: 'Outfit' }}>{session.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {session.mentee_first_name} {session.mentee_last_name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <style jsx global>{`
        @media(max-width: 768px) {
          .mentor-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function MentorDashboardPage() {
  return (
    <RouteGuard allowedRoles={['mentor']}>
      <MentorDashboardContent />
    </RouteGuard>
  );
}
