'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';

function InvestorDashboardContent() {
  const { user, logout, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firm_name: '',
    investor_type: 'vc',
    thesis: '',
    ticket_min: 0,
    ticket_max: 0,
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.investor_profile) {
      setFormData({
        firm_name: user.investor_profile.firm_name || '',
        investor_type: user.investor_profile.investor_type || 'vc',
        thesis: user.investor_profile.thesis || '',
        ticket_min: user.investor_profile.ticket_min || 0,
        ticket_max: user.investor_profile.ticket_max || 0,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      await HFAApi.updateInvestor(formData);
      await refreshProfile();
      setSuccessMsg('Investor profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
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
          <span className="badge badge-amber">Investor Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Welcome, {user?.first_name} {user?.last_name}
          </span>
          <button onClick={logout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 2rem' }}>
        
        <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
              {user?.investor_profile?.firm_name || `${user?.first_name}'s Investment Thesis`}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Define your sectors and ticket thresholds to search emerging startup hubs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/matching" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              🤖 Search Startups
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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="investor-workspace-grid">
          
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Thesis details</h2>
              <button 
                onClick={() => setEditing(!editing)}
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                {editing ? 'Cancel' : 'Edit Thesis'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Firm Name</label>
                  <input
                    type="text"
                    name="firm_name"
                    className="form-input"
                    value={formData.firm_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Investor Type</label>
                  <select
                    name="investor_type"
                    className="form-input"
                    value={formData.investor_type}
                    onChange={handleChange}
                    style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <option value="angel">Angel Investor</option>
                    <option value="vc">Venture Capital (VC)</option>
                    <option value="impact">Impact Fund</option>
                    <option value="family_office">Family Office</option>
                    <option value="government">Government Fund</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Thesis</label>
                  <textarea
                    name="thesis"
                    className="form-input"
                    rows={4}
                    value={formData.thesis}
                    onChange={handleChange}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Min Ticket ($ USD)</label>
                    <input
                      type="number"
                      name="ticket_min"
                      className="form-input"
                      value={formData.ticket_min}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Ticket ($ USD)</label>
                    <input
                      type="number"
                      name="ticket_max"
                      className="form-input"
                      value={formData.ticket_max}
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
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Investment Thesis</h4>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {user?.investor_profile?.thesis || 'No thesis provided yet.'}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Investor Type</h4>
                    <p style={{ fontWeight: 600, textTransform: 'uppercase' }}>{user?.investor_profile?.investor_type || 'VC'}</p>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Ticket Size Range</h4>
                    <p style={{ fontWeight: 600, color: 'var(--brand-amber)' }}>
                      ${(user?.investor_profile?.ticket_min || 0).toLocaleString()} - ${(user?.investor_profile?.ticket_max || 0).toLocaleString()} USD
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Compliance Status</h3>
              <span className="badge badge-green">✓ Approved Platform Investor</span>
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        @media(max-width: 768px) {
          .investor-workspace-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function InvestorDashboardPage() {
  return (
    <RouteGuard allowedRoles={['investor']}>
      <InvestorDashboardContent />
    </RouteGuard>
  );
}
