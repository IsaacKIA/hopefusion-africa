'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';

export default function ServiceProviderDashboardPage() {
  return (
    <RouteGuard allowedRoles={['service_provider']}>
      <ServiceProviderDashboardContent />
    </RouteGuard>
  );
}

function ServiceProviderDashboardContent() {
  const { user, logout } = useAuth();
  const mounted = useMounted();
  
  const [activeClients] = useState<any[]>([]);

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
          <span className="badge badge-amber">Service Provider Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Partner: {mounted ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() : ''}
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
              Welcome, {mounted ? user?.first_name || 'Partner' : 'Partner'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Offer professional advisory, legal, engineering, and consulting services to scaling African startups.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/marketplace" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
              🏪 Marketplace Hub
            </Link>
            <Link href="/matching" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
              🤝 Explore SME Matches
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Partner Status
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-green)', fontFamily: 'Outfit' }}>
              {mounted ? (user?.is_verified ? 'Verified' : 'Pending') : 'Active'}
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Active Client Engagements
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-amber)', fontFamily: 'Outfit' }}>
              {activeClients.length}
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Hope Score™
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'Outfit' }}>
              {mounted ? (user?.hope_score ?? 80) : 80}
            </p>
          </div>
        </div>

        {/* Layout grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="provider-grid">
          
          {/* Services List / Marketplace promotion */}
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontFamily: 'Outfit' }}>Your Service Catalog</h2>
                <Link href="/marketplace" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}>
                  + List in Marketplace
                </Link>
              </div>

              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📦</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Publish Your Offerings</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  List legal incorporation, financial audit, product engineering, and marketing packages directly in the B2B marketplace to receive inbound client inquiries.
                </p>
                <Link href="/marketplace" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Open Marketplace Manager
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Active Projects */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Active Client Engagement</h2>
              {activeClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>No active contracts underway.</p>
                  <Link href="/matching" className="btn-secondary" style={{ display: 'inline-block', padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    Find Startups
                  </Link>
                </div>
              ) : (
                activeClients.map(client => (
                  <div key={client.id} style={{ borderLeft: '4px solid var(--brand-green)', paddingLeft: '12px', margin: '12px 0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{client.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Project: {client.project}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick links */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Partner Utilities</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li>
                  <Link href="/matching" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🤝</span> Search Startup Needs
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏪</span> Marketplace Catalog
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/messages" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💬</span> Client Conversations
                  </Link>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .provider-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
