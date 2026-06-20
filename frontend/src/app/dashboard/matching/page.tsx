'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../lib/api';
import RouteGuard from '../../../components/RouteGuard';
import Link from 'next/link';

interface OpportunityMatch {
  id: string;
  title: string;
  description: string;
  opportunity_type: 'grant' | 'investment' | 'job' | 'accelerator' | 'competition' | 'scholarship' | 'procurement' | 'corporate_challenge' | 'government_program';
  value_amount: number | null;
  currency: string;
  eligible_countries: string[];
  eligible_sectors: string[];
  eligible_stages: string[];
  deadline: string | null;
  adjusted_score: number;
  raw_similarity: number;
}

function OpportunitiesContent() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    sector: '',
    stage: ''
  });

  const fetchMatchedOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (filters.type) params.set('type', filters.type);
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.stage) params.set('stage', filters.stage);

      const res = await API.get(`/opportunities/matches?${params}`);
      if (res?.success) {
        setOpportunities(res.data);
      }
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchedOpportunities();
  }, [filters]);

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'grant': return 'badge-green';
      case 'corporate_challenge': return 'badge-amber';
      case 'government_program': return 'badge-green';
      case 'investment': return 'badge-amber';
      default: return 'badge-secondary';
    }
  };

  const formatType = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
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
          <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Outfit' }}>
            Hope<span style={{ color: 'var(--brand-green)' }}>Fusion</span>
          </Link>
          <span className="badge badge-amber">Vector Opportunity Matcher</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Back to Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: '950px', margin: '0 auto', padding: '40px 2.5rem' }} className="fade-in">
        
        {/* Banner Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Matched Capital & Resources</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Ecosystem opportunities matched dynamically based on your vector profile embeddings, startup sector compatibility, and operational scale.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap',
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '16px', marginBottom: '32px'
        }}>
          <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Opportunity Type</label>
            <select 
              className="form-input" 
              value={filters.type} 
              onChange={e => setFilters({ ...filters, type: e.target.value })}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Types</option>
              <option value="grant">Grants</option>
              <option value="investment">Syndicated Investments</option>
              <option value="corporate_challenge">Corporate Challenges</option>
              <option value="government_program">Government Programs</option>
              <option value="accelerator">Accelerators</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Sector</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Agriculture, Fintech"
              value={filters.sector} 
              onChange={e => setFilters({ ...filters, sector: e.target.value })}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Startup Stage</label>
            <select 
              className="form-input" 
              value={filters.stage} 
              onChange={e => setFilters({ ...filters, stage: e.target.value })}
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Stages</option>
              <option value="idea">Idea / Pre-MVP</option>
              <option value="mvp">MVP Stage</option>
              <option value="early_traction">Early Traction</option>
              <option value="scaling">Scaling</option>
            </select>
          </div>
        </div>

        {/* Opportunity Match Items */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No matches found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
              Ensure your startup profile (sector, location, description) is fully completed to match with continental grants and program lists.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {opportunities.map((opp) => {
              const matchPercentage = Math.round(opp.adjusted_score * 100);
              const ringCircumference = 2 * Math.PI * 22;
              const ringOffset = ringCircumference * (1 - matchPercentage / 100);

              return (
                <div key={opp.id} className="glass-panel glass-panel-hover" style={{ padding: '28px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {/* Match score progress ring */}
                  <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle 
                        cx="28" cy="28" r="22" fill="none" 
                        stroke={matchPercentage >= 80 ? 'var(--brand-green)' : matchPercentage >= 60 ? 'var(--brand-amber)' : '#ef4444'} 
                        strokeWidth="4" 
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700
                    }}>
                      {matchPercentage}%
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.2rem' }}>{opp.title}</h3>
                      <span className={`badge ${getBadgeClass(opp.opportunity_type)}`} style={{ fontSize: '0.65rem' }}>
                        {formatType(opp.opportunity_type)}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                      {opp.description}
                    </p>

                    {/* Eligibility details */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {opp.value_amount && (
                        <span style={{ fontWeight: 600, color: 'var(--brand-amber)', backgroundColor: 'rgba(232, 160, 32, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                          Value: {opp.value_amount.toLocaleString()} {opp.currency}
                        </span>
                      )}
                      {opp.deadline && (
                        <span>Deadline: <strong>{new Date(opp.deadline).toLocaleDateString()}</strong></span>
                      )}
                      <span>Eligibility: {opp.eligible_countries?.join(', ')}</span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                    <Link href={`/grants`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', justifyContent: 'center' }}>
                      Apply Now
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <OpportunitiesContent />
    </RouteGuard>
  );
}
