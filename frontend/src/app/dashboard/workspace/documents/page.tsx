'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { API, HFAApi } from '../../../../lib/api';
import RouteGuard from '../../../../components/RouteGuard';
import Link from 'next/link';

function DocumentsContent() {
  const { user } = useAuth();
  const startupId = user?.startup_profile?.id;

  const [activeTab, setActiveTab] = useState<'oneliner' | 'outreach' | 'grant' | 'financials'>('oneliner');
  const [matchedInvestors, setMatchedInvestors] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Tab 1: One-liner generator state
  const [pitchSector, setPitchSector] = useState(user?.startup_profile?.sector || '');
  const [pitchProblem, setPitchProblem] = useState('');
  const [pitchSolution, setPitchSolution] = useState('');
  const [pitchMarket, setPitchMarket] = useState('');
  const [oneLiners, setOneLiners] = useState<any[]>([]);

  // Tab 2: Outreach message state
  const [selectedInvestorId, setSelectedInvestorId] = useState('');
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'linkedin' | 'warm_intro'>('email');
  const [outreachTone, setOutreachTone] = useState<'professional' | 'visionary' | 'analytical'>('professional');
  const [outreachResult, setOutreachResult] = useState<any | null>(null);

  // Tab 3: Grant Proposal state
  const [grantTitle, setGrantTitle] = useState('');
  const [grantSponsor, setGrantSponsor] = useState('');
  const [grantQuestion, setGrantQuestion] = useState('');
  const [grantWordLimit, setGrantWordLimit] = useState<number>(300);
  const [grantResult, setGrantResult] = useState<any | null>(null);

  // Tab 4: Financial Model state
  const [financialMonths, setFinancialMonths] = useState<number>(18);
  const [financialResult, setFinancialResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await HFAApi.loadMatches({ limit: 20 });
        if (res?.success) {
          setMatchedInvestors(res.data);
        }
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatches();
  }, []);

  const handleGenerateOneLiners = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setOneLiners([]);
    try {
      const payload = {
        startup_name: user?.startup_profile?.name || 'My Startup',
        sector: pitchSector,
        problem: pitchProblem,
        solution: pitchSolution,
        target_market: pitchMarket
      };
      const res = await API.post('/ai/pitch/oneliner', payload);
      if (res?.success && res.data?.options) {
        setOneLiners(res.data.options);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate pitches.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestorId) return;
    setGenerating(true);
    setOutreachResult(null);
    try {
      const match = matchedInvestors.find(m => m.target_id === selectedInvestorId);
      const investorData = {
        firm_name: match?.investor_detail?.firm || 'Target Investor VC',
        investor_type: match?.investor_detail?.type || 'venture_capital',
        sectors: match?.investor_detail?.sectors || ['general']
      };

      const payload = {
        startup: {
          name: user?.startup_profile?.name || 'My Startup',
          tagline: user?.startup_profile?.tagline || '',
          description: user?.startup_profile?.description || '',
          sector: user?.startup_profile?.sector || '',
          stage: user?.startup_profile?.stage || '',
          country: user?.startup_profile?.country || ''
        },
        investor: investorData,
        channel: outreachChannel,
        tone: outreachTone
      };

      const res = await API.post('/ai/fundraiser/draft', payload);
      if (res?.success) {
        setOutreachResult(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate outreach.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateGrantProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGrantResult(null);
    try {
      const payload = {
        startup: {
          name: user?.startup_profile?.name || 'My Startup',
          sector: user?.startup_profile?.sector || '',
          stage: user?.startup_profile?.stage || '',
          country: user?.startup_profile?.country || ''
        },
        grant: {
          title: grantTitle,
          sponsor: grantSponsor
        },
        question: grantQuestion,
        word_limit: grantWordLimit
      };

      const res = await API.post('/ai/grants/write', payload);
      if (res?.success) {
        setGrantResult(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to draft grant proposal.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFinancialModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setFinancialResult(null);
    try {
      const payload = {
        startup: {
          name: user?.startup_profile?.name || 'My Startup',
          sector: user?.startup_profile?.sector || '',
          stage: user?.startup_profile?.stage || '',
          country: user?.startup_profile?.country || '',
          funding_goal: user?.startup_profile?.funding_goal || 50000
        },
        months: financialMonths
      };

      const res = await API.post('/ai/financials/model', payload);
      if (res?.success) {
        setFinancialResult(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to project financial model.');
    } finally {
      setGenerating(false);
    }
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
          <span className="badge badge-amber">AI Document Studio</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Back to Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 2.5rem' }} className="fade-in">
        
        {/* Banner Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>AI Document & Pitch Writer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Co-pilot for generating standardized institutional investor pitches, grant application statements, and financial projections.
          </p>
        </div>

        {/* Tab Navigation Menu */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { id: 'oneliner', label: '🚀 One-Liner Pitch' },
            { id: 'outreach', label: '📧 Investor Outreach' },
            { id: 'grant', label: '🏆 Grant Proposal' },
            { id: 'financials', label: '📊 Financial Modeler' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className="btn-secondary"
              style={{
                padding: '8px 16px', fontSize: '0.85rem',
                borderColor: activeTab === t.id ? 'var(--brand-green)' : 'var(--border-color)',
                backgroundColor: activeTab === t.id ? 'rgba(45, 181, 98, 0.05)' : 'transparent',
                color: activeTab === t.id ? 'var(--brand-green)' : 'var(--text-primary)'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabs Area */}
        <div className="glass-panel" style={{ padding: '32px' }}>

          {/* TAB 1: ONE LINER PITCH GENERATOR */}
          {activeTab === 'oneliner' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Generate Core Pitch Lines</h2>
              <form onSubmit={handleGenerateOneLiners} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="startup-workspace-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Sector Focus</label>
                    <input type="text" className="form-input" value={pitchSector} onChange={e => setPitchSector(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Problem (What bottleneck do you solve?)</label>
                    <textarea className="form-input" rows={2} value={pitchProblem} onChange={e => setPitchProblem(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Solution (How do you solve it?)</label>
                    <textarea className="form-input" rows={2} value={pitchSolution} onChange={e => setPitchSolution(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Market</label>
                    <input type="text" className="form-input" placeholder="e.g. Smallholder farmers in East Africa" value={pitchMarket} onChange={e => setPitchMarket(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={generating} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {generating ? 'Generating Pitches...' : 'Generate 5 Pitches'}
                  </button>
                </div>

                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Generated Core Options
                  </h3>
                  
                  {oneLiners.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Options will display here once generated.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {oneLiners.map((opt, idx) => (
                        <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5, marginBottom: '8px' }}>"{opt.line}"</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span style={{ textTransform: 'capitalize' }}>Tone: <strong>{opt.tone}</strong></span>
                            <span>{opt.chars} Chars</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: INVESTOR OUTREACH WRITER */}
          {activeTab === 'outreach' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Investor Outreach Message Drafter</h2>
              <form onSubmit={handleGenerateOutreach} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="startup-workspace-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Select Target Investor Match</label>
                    <select className="form-input" value={selectedInvestorId} onChange={e => setSelectedInvestorId(e.target.value)} required>
                      <option value="">-- Choose Investor --</option>
                      {matchedInvestors.map(m => (
                        <option key={m.target_id} value={m.target_id}>
                          {m.investor_detail?.firm || 'Ecosystem Investor'} ({m.ai_score}% match)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Outreach Channel</label>
                    <select className="form-input" value={outreachChannel} onChange={e => setOutreachChannel(e.target.value as any)}>
                      <option value="email">Direct Email</option>
                      <option value="linkedin">LinkedIn Direct Message</option>
                      <option value="warm_intro">Warm Introduction Request</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message Tone</label>
                    <select className="form-input" value={outreachTone} onChange={e => setOutreachTone(e.target.value as any)}>
                      <option value="professional">Professional & Direct</option>
                      <option value="visionary">Visionary & Growth</option>
                      <option value="analytical">Data & Traction Oriented</option>
                    </select>
                  </div>

                  <button type="submit" disabled={generating || !selectedInvestorId} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {generating ? 'Drafting Message...' : 'Generate Pitch Draft'}
                  </button>
                </div>

                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Outreach Output Preview
                  </h3>
                  
                  {!outreachResult ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Generate to display outreach copy.</p>
                  ) : (
                    <div>
                      {outreachResult.subject && (
                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Subject Line</span>
                          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', marginTop: '4px' }}>
                            {outreachResult.subject}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Message Body</span>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-line', marginTop: '4px' }}>
                          {outreachResult.body}
                        </div>
                      </div>

                      {outreachResult.personalization_hooks?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hooks Used</span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {outreachResult.personalization_hooks.map((h: string, idx: number) => (
                              <span key={idx} className="badge badge-green" style={{ fontSize: '0.65rem' }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: GRANT PROPOSAL WRITER */}
          {activeTab === 'grant' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>AI Grant Application Writer</h2>
              <form onSubmit={handleGenerateGrantProposal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="startup-workspace-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Grant Program Title</label>
                      <input type="text" className="form-input" placeholder="Tony Elumelu Fund" value={grantTitle} onChange={e => setGrantTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sponsor / Organization</label>
                      <input type="text" className="form-input" placeholder="TEF Foundation" value={grantSponsor} onChange={e => setGrantSponsor(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Application Prompt / Question</label>
                    <textarea className="form-input" rows={4} placeholder="Describe how your startup leverages local networks to create socio-economic impact in your country..." value={grantQuestion} onChange={e => setGrantQuestion(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Word Limit Target</label>
                    <input type="number" className="form-input" value={grantWordLimit} onChange={e => setGrantWordLimit(parseInt(e.target.value) || 200)} required />
                  </div>

                  <button type="submit" disabled={generating} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {generating ? 'Drafting Proposal...' : 'Compose Answer Draft'}
                  </button>
                </div>

                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Draft Response Statement
                  </h3>
                  
                  {!grantResult ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Draft output will display here.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Word count: {grantResult.word_count} words</span>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '4px' }}>
                          {grantResult.draft}
                        </div>
                      </div>

                      {grantResult.strengths_leveraged?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Startup Strengths Woven In</span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {grantResult.strengths_leveraged.map((s: string, idx: number) => (
                              <span key={idx} className="badge badge-green" style={{ fontSize: '0.65rem' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {grantResult.suggested_edits?.length > 0 && (
                        <div style={{ backgroundColor: 'rgba(232, 160, 32, 0.04)', border: '1px solid rgba(232, 160, 32, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--brand-amber)', fontWeight: 600 }}>Actionable Founder Edits</span>
                          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            {grantResult.suggested_edits.map((item: string, idx: number) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: FINANCIAL MODEL BUILDER */}
          {activeTab === 'financials' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>AI Financial Modeler & Cash Forecast</h2>
              <form onSubmit={handleGenerateFinancialModel} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }} className="startup-workspace-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Projection Timeline (Months)</label>
                    <select className="form-input" value={financialMonths} onChange={e => setFinancialMonths(parseInt(e.target.value))}>
                      <option value="12">12 Months Projection</option>
                      <option value="18">18 Months Projection</option>
                      <option value="24">24 Months Projection</option>
                    </select>
                  </div>
                  <button type="submit" disabled={generating} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {generating ? 'Calculating Model...' : 'Build Financial Model'}
                  </button>

                  {financialResult && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Projected Runway:</span>
                        <strong style={{ display: 'block', fontSize: '1.5rem', color: 'var(--brand-green)', marginTop: '4px' }}>
                          {financialResult.runway_months} Months
                        </strong>
                      </div>
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Funding Required:</span>
                        <strong style={{ display: 'block', fontSize: '1.5rem', color: 'var(--brand-amber)', marginTop: '4px' }}>
                          ${financialResult.total_funding_needed?.toLocaleString()} USD
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Financial Matrix Report
                  </h3>
                  
                  {!financialResult ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Create forecast statement to preview projection table.</p>
                  ) : (
                    <div>
                      {/* Assumptions */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>CAC (Acquisition):</span>
                          <strong style={{ display: 'block', marginTop: '2px' }}>${financialResult.assumptions?.cac}</strong>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>LTV (Customer Value):</span>
                          <strong style={{ display: 'block', marginTop: '2px' }}>${financialResult.assumptions?.ltv}</strong>
                        </div>
                      </div>

                      {/* Projections Table */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                              <th style={{ padding: '8px' }}>Month</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Revenue</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Burn</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Net Bal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financialResult.projections?.slice(0, 6).map((proj: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '8px', fontWeight: 600 }}>M{proj.month}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--brand-green)' }}>${proj.revenue?.toLocaleString()}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>${proj.expenses?.toLocaleString()}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>${proj.cumulative_cash?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Risks */}
                      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Market Risk Vectors (Africa Ecosystem)</span>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {financialResult.key_risks?.map((risk: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <DocumentsContent />
    </RouteGuard>
  );
}
