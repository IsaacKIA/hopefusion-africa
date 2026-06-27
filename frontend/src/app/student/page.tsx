'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';

function StudentDashboardContent() {
  const { user, logout } = useAuth();
  const mounted = useMounted();
  
  const [courses] = useState([
    { id: 1, title: 'Introduction to Venture Capital', instructor: 'Dr. Kwame Nkrumah', progress: 80, stage: 'Intermediate' },
    { id: 2, title: 'Ecosystem Pitching & Storytelling', instructor: 'Patricia Adesua', progress: 45, stage: 'Beginner' },
    { id: 3, title: 'Legal & Intellectual Property in Africa', instructor: 'Nelsie Mandell', progress: 0, stage: 'Advanced' }
  ]);

  const [mentorSessions] = useState([
    { id: 'session-1', mentor: 'Dr. Kwame Nkrumah', date: 'June 29, 2026', time: '14:00 GMT', status: 'scheduled' }
  ]);

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
              Welcome, {mounted ? user?.first_name : 'Scholar'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Access your learning curriculum, book advisor mentoring sessions, and track your startup readiness.
            </p>
          </div>
          <div>
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
              {mounted ? user?.hope_score || 85 : 85}
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Curriculum Progress
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-amber)', fontFamily: 'Outfit' }}>42%</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Mentorship Hours
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'Outfit' }}>8.5 hrs</p>
          </div>
        </div>

        {/* Courses & Mentorship columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="student-grid">
          
          {/* Courses List */}
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontFamily: 'Outfit' }}>My Courses</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {courses.map(course => (
                  <div key={course.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{course.title}</h3>
                      <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>{course.stage}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Instructor: {course.instructor}</p>
                    
                    {/* Progress Bar */}
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: 'var(--brand-green)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar (Mentorship, Resources) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Scheduled Mentorship */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Upcoming Advisor Call</h2>
              {mentorSessions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No sessions booked.</p>
              ) : (
                mentorSessions.map(session => (
                  <div key={session.id} style={{ borderLeft: '4px solid var(--brand-green)', paddingLeft: '12px', margin: '12px 0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{session.mentor}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {session.date} at {session.time}
                    </p>
                    <Link href={`/mentorship`} className="btn-secondary" style={{ display: 'inline-block', marginTop: '10px', padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                      Open Room
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Quick Links */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Resources</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <Link href="/grants" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem' }}>
                    🏆 Grant Opportunities
                  </Link>
                </li>
                <li>
                  <Link href="/matching" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem' }}>
                    🤝 Ecosystem Search
                  </Link>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .student-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <RouteGuard allowedRoles={['student']}>
      <StudentDashboardContent />
    </RouteGuard>
  );
}
