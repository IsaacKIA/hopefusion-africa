'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';

function MatchingDashboardContent() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const res = await HFAApi.loadMatches({ minScore: 50, limit: 10 });
      if (res?.data) {
        setMatches(res.data);
      }
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleUpdateStatus = async (matchId: string, newStatus: string) => {
    setUpdatingId(matchId);
    try {
      await HFAApi.updateMatchStatus(matchId, newStatus);
      await fetchMatches(); // reload matches
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }} className="fade-in">
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
          <span className="badge badge-amber">AI Matchmaking</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Back to Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 2rem' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Ecosystem Co-Matches</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            AI-generated recommendations calculated from your profile sector, ticket goals, and tesis tags.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" />
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No matches found yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
              Ensure your profile name, description, and funding goals are filled in to activate matching triggers.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {matches.map((match) => {
              const ringCircumference = 2 * Math.PI * 22;
              const ringOffset = ringCircumference * (1 - match.ai_score / 100);
              
              return (
                <div key={match.id} className="glass-panel" style={{
                  padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap'
                }}>
                  {/* Matching score ring */}
                  <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle 
                        cx="28" cy="28" r="22" fill="none" 
                        stroke="var(--brand-green)" strokeWidth="4" 
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700
                    }}>
                      {match.ai_score}%
                    </div>
                  </div>

                  {/* Matching content details */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1.1rem' }}>
                        {match.investor_detail?.firm || 'Matching Capital Allocator'}
                      </h3>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                        Grade {match.ai_grade || 'A'}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Primary sector focus: {match.investor_detail?.sectors?.join(', ') || 'Emerging Tech, SaaS, FinTech'}
                    </p>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {match.ai_reasons?.map((reason: string, rIdx: number) => (
                        <span key={rIdx} style={{
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}>
                          • {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status update controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Match status: <strong style={{ color: 'var(--brand-amber)', textTransform: 'capitalize' }}>{match.status}</strong>
                    </div>
                    {match.status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateStatus(match.id, 'contacted')}
                        disabled={updatingId === match.id}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', justifyContent: 'center' }}
                      >
                        {updatingId === match.id ? 'Updating...' : 'Connect / Message'}
                      </button>
                    )}
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

export default function MatchingDashboardPage() {
  return (
    <RouteGuard allowedRoles={['startup', 'investor']}>
      <MatchingDashboardContent />
    </RouteGuard>
  );
}
