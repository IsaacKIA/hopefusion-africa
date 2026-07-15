'use client';

import React, { useState, useEffect } from 'react';
import RouteGuard from '../../../components/RouteGuard';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../lib/api';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'danger';

function SettingsContent() {
  const { user, refreshProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', phone: '', country: '', bio: '',
    linkedin_url: '', twitter_url: '', website_url: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security form
  const [securityForm, setSecurityForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Notification preferences (local only)
  const [notifPrefs, setNotifPrefs] = useState({ email_matches: true, email_grants: true, email_messages: false, push_all: true });

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: (user as any).phone || '',
        country: (user as any).country || '',
        bio: (user as any).bio || '',
        linkedin_url: (user as any).linkedin_url || '',
        twitter_url: (user as any).twitter_url || '',
        website_url: (user as any).website_url || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await API.patch('/users/profile', profileForm);
      if (res?.success) {
        await refreshProfile();
        setProfileSuccess('Profile updated successfully!');
      } else {
        setProfileError(res?.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccess(null);
    setSecurityError(null);
    if (securityForm.new_password !== securityForm.confirm_password) {
      setSecurityError('New passwords do not match.');
      return;
    }
    if (securityForm.new_password.length < 8) {
      setSecurityError('Password must be at least 8 characters.');
      return;
    }
    setSavingSecurity(true);
    try {
      const res = await API.post('/auth/change-password', {
        current_password: securityForm.current_password,
        new_password: securityForm.new_password,
      });
      if (res?.success) {
        setSecuritySuccess('Password changed successfully!');
        setSecurityForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setSecurityError(res?.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to change password.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const TABS: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profile Info', icon: '👤' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your profile, security, and notification preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px', alignItems: 'flex-start' }} className="settings-grid">
        {/* Sidebar Tabs */}
        <div className="glass-panel" style={{ padding: '12px' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: activeTab === tab.key ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                transition: 'all 0.2s',
                marginBottom: '4px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {/* Profile Info */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', fontFamily: 'Outfit' }}>Personal Information</h2>
              {profileSuccess && <div style={{ backgroundColor: 'rgba(45,181,98,0.1)', border: '1px solid rgba(45,181,98,0.2)', color: 'var(--brand-green)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>✓ {profileSuccess}</div>}
              {profileError && <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>{profileError}</div>}
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input type="text" className="form-input" value={profileForm.first_name} onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input type="text" className="form-input" value={profileForm.last_name} onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-input" placeholder="+233 20 000 0000" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="form-input" placeholder="e.g. Ghana" value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input" rows={3} placeholder="Tell the ecosystem about yourself..." value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Social Links</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">LinkedIn URL</label>
                      <input type="url" className="form-input" placeholder="https://linkedin.com/in/..." value={profileForm.linkedin_url} onChange={e => setProfileForm({ ...profileForm, linkedin_url: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Twitter / X URL</label>
                      <input type="url" className="form-input" placeholder="https://x.com/..." value={profileForm.twitter_url} onChange={e => setProfileForm({ ...profileForm, twitter_url: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Website URL</label>
                      <input type="url" className="form-input" placeholder="https://yourstartup.com" value={profileForm.website_url} onChange={e => setProfileForm({ ...profileForm, website_url: e.target.value })} />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={savingProfile} style={{ marginTop: '28px', padding: '12px 24px', fontSize: '0.9rem' }}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', fontFamily: 'Outfit' }}>Password & Security</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Update your account password. Passwords must be at least 8 characters with uppercase, lowercase, and a number.</p>
              {securitySuccess && <div style={{ backgroundColor: 'rgba(45,181,98,0.1)', border: '1px solid rgba(45,181,98,0.2)', color: 'var(--brand-green)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>✓ {securitySuccess}</div>}
              {securityError && <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>{securityError}</div>}
              <form onSubmit={handleSaveSecurity} style={{ maxWidth: '480px' }}>
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <input type="password" className="form-input" value={securityForm.current_password} onChange={e => setSecurityForm({ ...securityForm, current_password: e.target.value })} required autoComplete="current-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input type="password" className="form-input" value={securityForm.new_password} onChange={e => setSecurityForm({ ...securityForm, new_password: e.target.value })} required autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input type="password" className="form-input" value={securityForm.confirm_password} onChange={e => setSecurityForm({ ...securityForm, confirm_password: e.target.value })} required autoComplete="new-password" />
                </div>
                <button type="submit" className="btn-primary" disabled={savingSecurity} style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
                  {savingSecurity ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* Notification Preferences */}
          {activeTab === 'notifications' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', fontFamily: 'Outfit' }}>Notification Preferences</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '28px' }}>Choose how and when you receive updates from the HopeFusion ecosystem.</p>
              {[
                { key: 'email_matches', label: 'Email: New Investor & Opportunity Matches', desc: 'Get notified when AI finds new matching opportunities for your profile.' },
                { key: 'email_grants', label: 'Email: Grant Application Updates', desc: 'Receive status updates on submitted grant applications.' },
                { key: 'email_messages', label: 'Email: New Direct Messages', desc: 'Get email notifications for new messages from investors and mentors.' },
                { key: 'push_all', label: 'Push Notifications: All Activity', desc: 'Enable browser push notifications for all ecosystem activity.' },
              ].map(pref => (
                <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>{pref.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{pref.desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [pref.key]: !prev[pref.key as keyof typeof prev] }))}
                    style={{
                      width: '44px', height: '24px', borderRadius: '99px', border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'background-color 0.3s',
                      backgroundColor: notifPrefs[pref.key as keyof typeof notifPrefs] ? 'var(--brand-green)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span style={{ position: 'absolute', top: '3px', left: notifPrefs[pref.key as keyof typeof notifPrefs] ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.3s', display: 'block' }} />
                  </button>
                </div>
              ))}
              <button className="btn-primary" style={{ marginTop: '24px', padding: '10px 24px', fontSize: '0.85rem' }} onClick={() => alert('Notification preferences saved!')}>
                Save Preferences
              </button>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div className="glass-panel" style={{ padding: '32px', borderColor: 'rgba(239,68,68,0.2)' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', fontFamily: 'Outfit', color: '#ef4444' }}>⚠️ Danger Zone</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '28px' }}>These actions are irreversible. Please proceed with caution.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Sign Out of All Devices</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Invalidates all active sessions across devices.</div>
                  </div>
                  <button onClick={logout} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sign Out Everywhere
                  </button>
                </div>
                <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Delete Account</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Permanently deletes your profile, startup data, and ecosystem history. Cannot be undone.</div>
                  </div>
                  <button onClick={() => alert('Please contact support@hopefusion.africa to request account deletion.')} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
