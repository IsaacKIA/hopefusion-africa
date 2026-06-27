'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';

function ServiceProviderDashboardContent() {
  const { user, logout } = useAuth();
  const mounted = useMounted();
  
  const [services] = useState([
    { id: 1, name: 'Legal Incorporation & Compliance Advisory', status: 'Active', price: '$500 Flat' },
    { id: 2, name: 'Financial Modeling & Cap Table Audit', status: 'Active', price: '$75/hr' },
    { id: 3, name: 'Custom Software & Mobile App Engineering', status: 'Draft', price: 'Quote' }
  ]);

  const [activeClients] = useState([
    { id: 'client-1', name: 'Zuri Health Group', type: 'Startup', project: 'HIPAA Assessment', milestone: 'Milestone 2/3' }
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
          <span className="badge badge-amber">Service Provider Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Agency: {mounted ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() : ''}
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
              Welcome, {mounted ? user?.first_name : 'Provider'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Offer professional services to registered startups, establish project milestone escrows, and audit client matches.
            </p>
          </div>
          <div>
            <Link href="/matching" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
              Find Client Inquiries
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Ecosystem Partner Status
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-green)', fontFamily: 'Outfit' }}>Verified</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Active Client Projects
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-amber)', fontFamily: 'Outfit' }}>1</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Listed Service Packages
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'Outfit' }}>3</p>
          </div>
        </div>

        {/* Layout grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="provider-grid">
          
          {/* Services List */}
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontFamily: 'Outfit' }}>My Service Listings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {services.map(service => (
                  <div key={service.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{service.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Pricing: {service.price}</p>
                    </div>
                    <span className={`badge ${service.status === 'Active' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.75rem' }}>
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Active Projects */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Active Client Engagement</h2>
              {activeClients.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No active contracts.</p>
              ) : (
                activeClients.map(client => (
                  <div key={client.id} style={{ borderLeft: '4px solid var(--brand-green)', paddingLeft: '12px', margin: '12px 0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{client.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Project: {client.project}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--brand-amber)', marginTop: '2px', fontWeight: 500 }}>
                      Status: {client.milestone}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick links */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'Outfit' }}>Partner Utilities</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <Link href="/matching" style={{ color: 'var(--brand-green)', textDecoration: 'none', fontSize: '0.9rem' }}>
                    🔍 Search Startup Needs
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

export default function ServiceProviderDashboardPage() {
  return (
    <RouteGuard allowedRoles={['service_provider']}>
      <ServiceProviderDashboardContent />
    </RouteGuard>
  );
}
