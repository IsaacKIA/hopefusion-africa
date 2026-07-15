'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';
import DashboardLayout from '../../components/DashboardLayout';

function StartupDashboardContent() {
  const { user, logout, refreshProfile } = useAuth();
  const mounted = useMounted();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    funding_goal: 0,
    sector: 'general',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.startup_profile) {
      setFormData({
        name: user.startup_profile.name || '',
        tagline: user.startup_profile.tagline || '',
        description: user.startup_profile.description || '',
        funding_goal: user.startup_profile.funding_goal || 0,
        sector: user.startup_profile.sector || 'general',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      await HFAApi.updateStartup(formData);
      await refreshProfile();
      setSuccessMsg('Startup profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        
        {/* Banner Card */}
        <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
              {mounted ? (user?.startup_profile?.name || `${user?.first_name ?? ''}'s Startup`) : ''}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {mounted ? (user?.startup_profile?.tagline || 'Define your tagline to match with investors.') : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/matching" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              🤖 AI Investor Match
            </Link>
            <Link href="/dashboard/workspace" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              📊 Founder Workspace (OS)
            </Link>
            <Link href="/dashboard/workspace/documents" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              📝 AI Document Studio
            </Link>
            <Link href="/dashboard/matching" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              🎯 Match Opportunities
            </Link>
          </div>
        </div>

        {successMsg && (
          <div style={{
            backgroundColor: 'rgba(45, 181, 98, 0.1)',
            border: '1px solid rgba(45, 181, 98, 0.2)',
            color: 'var(--brand-green)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px'
          }}>
            {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="startup-workspace-grid">
          
          {/* Profile Section */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Startup Details</h2>
              <button 
                onClick={() => setEditing(!editing)}
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Startup Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tagline</label>
                  <input
                    type="text"
                    name="tagline"
                    className="form-input"
                    value={formData.tagline}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Funding Goal ($ USD)</label>
                    <input
                      type="number"
                      name="funding_goal"
                      className="form-input"
                      value={formData.funding_goal}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sector</label>
                    <input
                      type="text"
                      name="sector"
                      className="form-input"
                      value={formData.sector}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ marginTop: '12px' }}
                >
                  {saving ? 'Saving...' : 'Save Updates'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Description</h4>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {mounted ? (user?.startup_profile?.description || 'No description provided yet.') : ''}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sector</h4>
                    <p style={{ fontWeight: 600 }}>{mounted ? (user?.startup_profile?.sector || 'General') : ''}</p>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Funding Goal</h4>
                    <p style={{ fontWeight: 600, color: 'var(--brand-amber)' }}>
                      ${mounted ? (user?.startup_profile?.funding_goal || 0).toLocaleString() : '0'} USD
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats & Alerts Sidebars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Verify Account</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Complete email verification to enable investment requests.
              </p>
              {user?.is_verified ? (
                <span className="badge badge-green">✓ Email Verified</span>
              ) : (
                <Link href="/verify" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                  Verify Email
                </Link>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Ecosystem Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ecosystem XP</span>
                <span style={{ fontWeight: 600 }}>450 XP</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--brand-green)' }} />
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Operational Runway</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Track bank cash flows, simulate runway scenarios, and manage CRM deals.
              </p>
              <Link href="/dashboard/workspace" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                📊 Open Founder Workspace
              </Link>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media(max-width: 768px) {
          .startup-workspace-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}

export default function StartupDashboardPage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <StartupDashboardContent />
    </RouteGuard>
  );
}
