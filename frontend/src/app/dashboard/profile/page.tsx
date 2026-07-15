'use client';

import React, { useState, useEffect } from 'react';
import RouteGuard from '../../../components/RouteGuard';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { HFAApi } from '../../../lib/api';
import Link from 'next/link';
import { useMounted } from '../../../hooks/useMounted';

function ProfileContent() {
  const { user } = useAuth();
  const mounted = useMounted();
  const [startupProfile, setStartupProfile] = useState<any>(null);
  const [activityLog] = useState([
    { date: '2026-07-15', action: 'Submitted grant application to SDG Impact Award', type: 'grant' },
    { date: '2026-07-14', action: 'Completed mentorship session with Dr. Amara Diallo', type: 'mentor' },
    { date: '2026-07-12', action: 'New investor match: Nairobi Capital Partners (94%)', type: 'match' },
    { date: '2026-07-10', action: 'Uploaded Milestone 1 evidence — escrow contract #ESC-2024-001', type: 'escrow' },
    { date: '2026-07-08', action: 'Completed course: Legal Foundations for Founders', type: 'learning' },
  ]);

  useEffect(() => {
    if (user?.startup_profile) setStartupProfile(user.startup_profile);
  }, [user]);

  const hopeScore = (user as any)?.hope_score || 680;
  const profileCompletion = (user as any)?.profile_completion || 72;
  const maxScore = 1000;
  const scoreColor = hopeScore >= 800 ? 'var(--brand-green)' : hopeScore >= 600 ? 'var(--brand-amber)' : '#ef4444';

  const ACTIVITY_ICONS: Record<string, string> = {
    grant: '🏆', mentor: '📚', match: '🎯', escrow: '💰', learning: '🎓', default: '📌'
  };

  if (!mounted) return null;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit' }}>My Profile</h1>
        <Link href="/dashboard/settings" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
          ✏️ Edit Profile
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '28px', alignItems: 'flex-start' }} className="profile-grid">

        {/* LEFT COLUMN - Identity Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Avatar Card */}
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(45, 181, 98, 0.1)', border: '2px solid rgba(45, 181, 98, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.75rem', color: 'var(--brand-green)', margin: '0 auto 16px' }}>
              {user?.first_name?.charAt(0) || 'U'}{user?.last_name?.charAt(0) || ''}
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'Outfit', marginBottom: '4px' }}>
              {user?.first_name} {user?.last_name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              {user?.role?.replace('_', ' ')}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {(user as any)?.bio || 'No bio added yet. Add one in Settings to help ecosystem partners understand your mission.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {(user as any)?.linkedin_url && <a href={(user as any).linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'none' }}>LinkedIn ↗</a>}
              {(user as any)?.twitter_url && <a href={(user as any).twitter_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'none' }}>Twitter ↗</a>}
              {(user as any)?.website_url && <a href={(user as any).website_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'none' }}>Website ↗</a>}
            </div>
          </div>

          {/* HopeScore Passport Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>HopeScore™ Passport</h3>
              <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>{(user as any)?.verification_status || 'Verified'}</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor, fontFamily: 'Outfit', lineHeight: 1, marginBottom: '6px' }}>{hopeScore}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '16px' }}>out of {maxScore} max trust score</div>
            {/* Score bar */}
            <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ height: '100%', width: `${(hopeScore / maxScore) * 100}%`, backgroundColor: scoreColor, borderRadius: '99px', transition: 'width 0.8s ease' }} />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Profile Completion</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{profileCompletion}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${profileCompletion}%`, backgroundColor: 'var(--brand-amber)', borderRadius: '99px' }} />
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '14px' }}>Account Info</h3>
            {[
              { label: 'Email', value: user?.email },
              { label: 'Country', value: (user as any)?.country || '—' },
              { label: 'Role', value: user?.role?.replace('_', ' '), highlight: true },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: item.highlight ? 'var(--brand-green)' : 'var(--text-secondary)', textTransform: item.highlight ? 'capitalize' : 'none' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN - Startup Passport + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Startup Profile card (for startup role) */}
          {user?.role === 'startup' && (
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', fontWeight: 700 }}>Startup Passport</h2>
                {startupProfile?.is_verified && <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>✓ Verified Startup</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'Company Name', value: startupProfile?.name || '—' },
                  { label: 'Sector', value: startupProfile?.sector || '—' },
                  { label: 'Country', value: startupProfile?.country || '—' },
                  { label: 'Stage', value: startupProfile?.stage || '—' },
                  { label: 'Funding Goal', value: startupProfile?.funding_goal ? `$${Number(startupProfile.funding_goal).toLocaleString()}` : '—' },
                  { label: 'Team Size', value: startupProfile?.headcount ? `${startupProfile.headcount} people` : '—' },
                ].map((item, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: item.value === '—' ? 'var(--text-muted)' : 'white', textTransform: 'capitalize' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {startupProfile?.description && (
                <div style={{ padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>About</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{startupProfile.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Log */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '20px' }}>Recent Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {activityLog.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: i < activityLog.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.default}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.4, marginBottom: '4px' }}>{item.action}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
