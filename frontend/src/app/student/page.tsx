'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';
import { HFAApi } from '../../lib/api';

interface MentorSession {
  id: string;
  title?: string;
  mentor_first_name?: string;
  mentor_last_name?: string;
  scheduled_at: string;
  status: string;
  duration_minutes?: number;
}

export default function StudentDashboardPage() {
  return (
    <RouteGuard allowedRoles={['student']}>
      <StudentDashboardContent />
    </RouteGuard>
  );
}

function StudentDashboardContent() {
  const { user, logout } = useAuth();
  const mounted = useMounted();
  
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingSessions(true);
      setSessionsError(null);
      try {
        const res = await HFAApi.loadMySessions();
        if (isMounted && res?.data) {
          setSessions(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setSessionsError(err.message || 'Could not load sessions.');
        }
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const upcomingSessions = sessions.filter(
    (s) => s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'live'
  );

  const completedHours = sessions
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (s.duration_minutes || 45) / 60, 0);

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
          <span className="badge badge-amber">Student Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Student: {mounted ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() : ''}
          </span>
          <button onClick={logout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 2rem' }}>
        
        {/* Welcome Banner */}
        <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px', fontFamily: 'Outfit' }}>
              Welcome, {mounted ? user?.first_name || 'Scholar' : 'Scholar'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Access your learning curriculum, book advisor mentoring sessions, and track your startup readiness.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/elearning" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
              📚 Course Catalog
            </Link>
            <Link href="/mentorship" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
              Book Mentor Session
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Hope Score™
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-green)', fontFamily: 'Outfit' }}>
              {mounted ? (user?.hope_score ?? 85) : 85}
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Upcoming Sessions
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-amber)', fontFamily: 'Outfit' }}>
              {loadingSessions ? '—' : upcomingSessions.length}
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Mentorship Completed
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'Outfit' }}>
              {loadingSessions ? '—' : `${completedHours.toFixed(1)} hrs`}
            </p>
          </div>
        </div>

        {/* Courses & Mentorship columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="student-grid">
          
          {/* Courses List */}
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontFamily: 'Outfit' }}>Recommended Curriculum</h2>
                <Link href="/elearning" style={{ color: 'var(--brand-green)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                  View All Modules →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Intermediate</span>
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Finance</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Venture Capital & African Fundraising</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>6 hours · 18 lessons · +350 XP</p>
                  </div>
                  <Link href="/elearning" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Open Module
                  </Link>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Advanced</span>
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Growth</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Product-Led Growth for African SaaS</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>8 hours · 24 lessons · +500 XP</p>
                  </div>
                  <Link href="/elearning" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Open Module
                  </Link>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Beginner</span>
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Legal</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Legal Foundations for African Founders</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>4 hours · 12 lessons · +200 XP</p>
                  </div>
                  <Link href="/elearning" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Open Module
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar (Mentorship, Resources) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Scheduled Mentorship */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.1rem', fontFamily: 'Outfit' }}>Advisor Sessions</h2>
                <Link href="/mentorship" style={{ color: 'var(--brand-green)', fontSize: '0.8rem', textDecoration: 'none' }}>
                  Book +
                </Link>
              </div>

              {loadingSessions ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                  <div className="spinner" />
                </div>
              ) : sessionsError ? (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{sessionsError}</p>
              ) : upcomingSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>No upcoming sessions booked.</p>
                  <Link href="/mentorship" className="btn-primary" style={{ display: 'inline-block', padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Browse Mentors
                  </Link>
                </div>
              ) : (
                upcomingSessions.slice(0, 3).map(session => (
                  <div key={session.id} style={{ borderLeft: '4px solid var(--brand-green)', paddingLeft: '12px', margin: '12px 0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {session.mentor_first_name ? `${session.mentor_first_name} ${session.mentor_last_name || ''}` : session.title || 'Advisor Call'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {new Date(session.scheduled_at).toLocaleDateString()} at {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Link href={`/mentorship`} className="btn-secondary" style={{ display: 'inline-block', marginTop: '10px', padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                      {session.status === 'live' ? '🔴 Enter Room' : 'View Session'}
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Quick Links */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Ecosystem Resources</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li>
                  <Link href="/grants" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏆</span> Grant Opportunities
                  </Link>
                </li>
                <li>
                  <Link href="/matching" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🤝</span> Ecosystem Matching
                  </Link>
                </li>
                <li>
                  <Link href="/elearning" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎓</span> Full Course Catalog
                  </Link>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      <style>{`
        @media (max-width: 768px) {
          .student-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
