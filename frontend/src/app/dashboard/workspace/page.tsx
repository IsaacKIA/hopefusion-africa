'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API, HFAApi } from '../../../lib/api';
import RouteGuard from '../../../components/RouteGuard';
import Link from 'next/link';

interface LedgerItem {
  month: string;
  cash_in: number;
  cash_out: number;
}

interface FinancialData {
  startup_id: string;
  bank_balance: number;
  monthly_burn_rate: number;
  currency: string;
  ledger_history: LedgerItem[];
  forecasted_runway_months: number;
}

interface CRMDeal {
  id: string;
  startup_id: string;
  investor_node_id: string;
  pipeline_stage: 'lead' | 'contacted' | 'pitching' | 'due_diligence' | 'term_sheet' | 'funded' | 'passed';
  notes: string;
  equity_offered: number;
  investor_details?: {
    name: string;
    firm: string;
    type: string;
    sectors: string[];
  };
}

interface EscrowMilestone {
  id: string;
  escrow_id: string;
  milestone_index: number;
  title: string;
  amount: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  evidence_uri?: string;
  submitted_at?: string;
  due_date?: string;
}

interface EscrowContract {
  id: string;
  deal_id: string;
  investor_node_id: string;
  startup_node_id: string;
  total_amount: number;
  currency: string;
  escrow_type: 'MATIC' | 'ERC20' | 'MOBILE_MONEY' | 'CARD';
  status: 'active' | 'completed' | 'disputed' | 'cancelled';
  arbitrator_node_id: string;
  created_at: string;
  milestones: EscrowMilestone[];
}

function WorkspaceContent() {
  const { user } = useAuth();
  const startupId = user?.startup_profile?.id;

  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [crmDeals, setCrmDeals] = useState<CRMDeal[]>([]);
  const [matchedInvestors, setMatchedInvestors] = useState<any[]>([]);
  const [escrows, setEscrows] = useState<EscrowContract[]>([]);
  const [loading, setLoading] = useState(true);

  // Financial form state
  const [balanceInput, setBalanceInput] = useState<number>(0);
  const [burnInput, setBurnInput] = useState<number>(0);
  const [ledgerMonth, setLedgerMonth] = useState('');
  const [ledgerIn, setLedgerIn] = useState<number>(0);
  const [ledgerOut, setLedgerOut] = useState<number>(0);

  // Runway Simulation State
  const [simulateBurn, setSimulateBurn] = useState<number>(0);

  // CRM form state
  const [selectedInvestorId, setSelectedInvestorId] = useState('');
  const [crmStage, setCrmStage] = useState<'lead' | 'contacted' | 'pitching' | 'due_diligence' | 'term_sheet' | 'funded' | 'passed'>('lead');
  const [crmNotes, setCrmNotes] = useState('');
  const [crmEquity, setCrmEquity] = useState<number>(0);

  // Escrow submit state
  const [submittingEvidenceId, setSubmittingEvidenceId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [savingFinancials, setSavingFinancials] = useState(false);
  const [savingCrm, setSavingCrm] = useState(false);

  const fetchData = async () => {
    if (!startupId) return;
    try {
      // 1. Fetch financials
      const finRes = await API.get(`/workspace/financials/${startupId}`);
      if (finRes?.success) {
        setFinancials(finRes.data);
        setBalanceInput(finRes.data.bank_balance);
        setBurnInput(finRes.data.monthly_burn_rate);
        setSimulateBurn(finRes.data.monthly_burn_rate || 5000);
      }

      // 2. Fetch CRM deals
      const crmRes = await API.get(`/workspace/crm/${startupId}`);
      if (crmRes?.success) {
        setCrmDeals(crmRes.data);
      }

      // 3. Fetch matched investors to choose from
      const matchesRes = await HFAApi.loadMatches({ limit: 30 });
      if (matchesRes?.success) {
        setMatchedInvestors(matchesRes.data);
      }

      // 4. Fetch dynamic escrows
      const escrowsRes = await API.get(`/workspace/escrows/${startupId}`);
      if (escrowsRes?.success) {
        setEscrows(escrowsRes.data);
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startupId]);

  const handleSaveFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId) return;
    setSavingFinancials(true);

    try {
      const payload = {
        startup_id: startupId,
        bank_balance: balanceInput,
        monthly_burn_rate: burnInput,
        currency: financials?.currency || 'USD',
        ledger_history: financials?.ledger_history || []
      };

      const res = await API.post('/workspace/financials', payload);
      if (res?.success) {
        setFinancials(res.data);
        alert('Financial ledger updated successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update financials.');
    } finally {
      setSavingFinancials(false);
    }
  };

  const handleAddLedgerItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId || !financials || !ledgerMonth) return;

    const newItem: LedgerItem = {
      month: ledgerMonth,
      cash_in: ledgerIn,
      cash_out: ledgerOut
    };

    const updatedHistory = [...(financials.ledger_history || []), newItem];
    setSavingFinancials(true);

    try {
      const payload = {
        startup_id: startupId,
        bank_balance: financials.bank_balance,
        monthly_burn_rate: financials.monthly_burn_rate,
        currency: financials.currency,
        ledger_history: updatedHistory
      };

      const res = await API.post('/workspace/financials', payload);
      if (res?.success) {
        setFinancials(res.data);
        setLedgerMonth('');
        setLedgerIn(0);
        setLedgerOut(0);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add ledger item.');
    } finally {
      setSavingFinancials(false);
    }
  };

  const handleAddCrmDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId || !selectedInvestorId) return;
    setSavingCrm(true);

    try {
      const payload = {
        startup_id: startupId,
        investor_node_id: selectedInvestorId,
        pipeline_stage: crmStage,
        notes: crmNotes,
        equity_offered: crmEquity
      };

      const res = await API.post('/workspace/crm', payload);
      if (res?.success) {
        setSelectedInvestorId('');
        setCrmNotes('');
        setCrmEquity(0);
        setCrmStage('lead');
        // reload CRM deals
        const crmRes = await API.get(`/workspace/crm/${startupId}`);
        if (crmRes?.success) {
          setCrmDeals(crmRes.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register CRM deal.');
    } finally {
      setSavingCrm(false);
    }
  };

  const handleMoveCrmStage = async (deal: CRMDeal, newStage: typeof crmStage) => {
    if (!startupId) return;
    try {
      const payload = {
        startup_id: startupId,
        investor_node_id: deal.investor_node_id,
        pipeline_stage: newStage,
        notes: deal.notes,
        equity_offered: deal.equity_offered
      };
      await API.post('/workspace/crm', payload);
      const crmRes = await API.get(`/workspace/crm/${startupId}`);
      if (crmRes?.success) {
        setCrmDeals(crmRes.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to move stage');
    }
  };

  const handleSubmitEvidence = async (escrowId: string, milestoneId: string) => {
    if (!evidenceUrl.trim()) return;
    try {
      const res = await API.post(`/corporate/escrow/${escrowId}/milestone/${milestoneId}/submit`, {
        evidence_uri: evidenceUrl
      });
      if (res?.success) {
        alert('Validation evidence URL submitted successfully!');
        setSubmittingEvidenceId(null);
        setEvidenceUrl('');
        // Reload escrows
        const escrowsRes = await API.get(`/workspace/escrows/${startupId}`);
        if (escrowsRes?.success) {
          setEscrows(escrowsRes.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit evidence.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const simulatedRunway = simulateBurn > 0 ? (financials?.bank_balance || 0) / simulateBurn : 99.9;
  const crmStages: Array<typeof crmStage> = ['lead', 'contacted', 'pitching', 'due_diligence', 'term_sheet', 'funded', 'passed'];

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
          <span className="badge badge-green">Founder Workspace / OS</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Dashboard Home
        </Link>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 2.5rem' }} className="fade-in">
        
        {/* Dynamic Runway Dashboard Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }} className="startup-workspace-grid">
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Bank Cash Runway
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{
                  fontSize: '4rem', fontWeight: 800, fontFamily: 'Outfit',
                  color: (financials?.forecasted_runway_months || 0) >= 12 ? 'var(--brand-green)' : (financials?.forecasted_runway_months || 0) >= 6 ? 'var(--brand-amber)' : '#ef4444'
                }}>
                  {financials?.forecasted_runway_months?.toFixed(1) || '0.0'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 600 }}>Months</span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monthly Burn Rate:</span>
                <span style={{ fontWeight: 600 }}>${financials?.monthly_burn_rate?.toLocaleString()} {financials?.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Liquid Cash Balance:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-green)' }}>${financials?.bank_balance?.toLocaleString()} {financials?.currency}</span>
              </div>
            </div>
          </div>

          {/* Runway Simulator */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Scenario Simulator (Runway Projection)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Drag the slider to project how runway changes if you decrease/increase monthly expenditure (burn rate).
            </p>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Simulated Burn:</span>
                <span style={{ fontWeight: 700, color: 'var(--brand-amber)' }}>${simulateBurn.toLocaleString()} / mo</span>
              </div>
              <input 
                type="range" 
                min={1000} 
                max={Math.max(50000, (financials?.monthly_burn_rate || 5000) * 2)} 
                step={500} 
                value={simulateBurn} 
                onChange={(e) => setSimulateBurn(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-amber)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Simulated Runway</span>
              <strong style={{ fontSize: '2rem', fontFamily: 'Outfit', color: simulatedRunway >= 12 ? 'var(--brand-green)' : simulatedRunway >= 6 ? 'var(--brand-amber)' : '#ef4444' }}>
                {simulatedRunway.toFixed(1)} Months
              </strong>
            </div>
          </div>
        </div>

        {/* Ledger & Ledger Input Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '48px' }} className="startup-workspace-grid">
          {/* Ledger Listing */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Monthly Ledger History</h3>
            
            {(!financials?.ledger_history || financials.ledger_history.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No cash flow ledger records added yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ paddingBottom: '12px' }}>Month</th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Cash Inflow</th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Cash Outflow</th>
                      <th style={{ paddingBottom: '12px', textAlign: 'right' }}>Net Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financials.ledger_history.map((item, idx) => {
                      const net = item.cash_in - item.cash_out;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 0', fontWeight: 600 }}>{item.month}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--brand-green)' }}>+${item.cash_in.toLocaleString()}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', color: '#ef4444' }}>-${item.cash_out.toLocaleString()}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: net >= 0 ? 'var(--brand-green)' : '#ef4444' }}>
                            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Update Ledger Overview Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Update Bank Runway Parameters</h3>
              <form onSubmit={handleSaveFinancials}>
                <div className="form-group">
                  <label className="form-label">Liquid Cash Balance ($)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={balanceInput} 
                    onChange={(e) => setBalanceInput(parseFloat(e.target.value) || 0)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Burn Rate ($)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={burnInput} 
                    onChange={(e) => setBurnInput(parseFloat(e.target.value) || 0)} 
                    required 
                  />
                </div>
                <button type="submit" disabled={savingFinancials} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {savingFinancials ? 'Saving...' : 'Update Cash Details'}
                </button>
              </form>
            </div>

            {/* Add Ledger Item Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Record Monthly Cash Flow</h3>
              <form onSubmit={handleAddLedgerItem}>
                <div className="form-group">
                  <label className="form-label">Month Name (e.g. June 2026)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="June 2026"
                    value={ledgerMonth} 
                    onChange={(e) => setLedgerMonth(e.target.value)} 
                    required 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Cash In ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={ledgerIn} 
                      onChange={(e) => setLedgerIn(parseFloat(e.target.value) || 0)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cash Out ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={ledgerOut} 
                      onChange={(e) => setLedgerOut(parseFloat(e.target.value) || 0)} 
                      required 
                    />
                  </div>
                </div>
                <button type="submit" disabled={savingFinancials} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Log Cash Flow Entry
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Active Disbursements & Escrows Section */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Active Capital Disbursements & Escrows</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Monitor milestones, view locked funding balances, and submit validation proof for payout releases.
          </p>

          {escrows.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active milestones or procurement escrows found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {escrows.map(escrow => (
                <div key={escrow.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Contract: {escrow.deal_id}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Escrow Type: <strong>{escrow.escrow_type}</strong> · Status: <span style={{ fontWeight: 600, color: escrow.status === 'completed' ? 'var(--brand-green)' : 'var(--brand-amber)' }}>{escrow.status.toUpperCase()}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-amber)' }}>
                        ${escrow.total_amount.toLocaleString()} {escrow.currency}
                      </span>
                    </div>
                  </div>

                  {/* Milestones list */}
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px' }}>
                    <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Milestones & Requirements</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {escrow.milestones?.map((m, idx) => (
                        <div key={m.id} style={{
                          borderBottom: idx < escrow.milestones.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          paddingBottom: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.title}</span>
                              {m.evidence_uri && (
                                <a href={m.evidence_uri} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'underline' }}>
                                  Submitted Proof: {m.evidence_uri}
                                </a>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>${m.amount.toLocaleString()}</span>
                              <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'submitted' ? 'badge-amber' : m.status === 'rejected' ? 'badge-red' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                {m.status.toUpperCase()}
                              </span>
                              {(m.status === 'pending' || m.status === 'rejected') && (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => setSubmittingEvidenceId(submittingEvidenceId === m.id ? null : m.id)}
                                >
                                  {submittingEvidenceId === m.id ? 'Cancel' : 'Submit Proof'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Submit form */}
                          {submittingEvidenceId === m.id && (
                            <div style={{
                              display: 'flex', gap: '10px', marginTop: '6px',
                              backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px'
                            }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                                placeholder="Evidence URL (e.g. GitHub link, PDF report URL...)"
                                value={evidenceUrl}
                                onChange={e => setEvidenceUrl(e.target.value)}
                              />
                              <button
                                className="btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => handleSubmitEvidence(escrow.id, m.id)}
                                disabled={!evidenceUrl.trim()}
                              >
                                Submit Evidence
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* V4 Investor CRM Board */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Investor CRM Pipeline</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Track active outreach, pitch responses, term sheets, and funding commitments with your matches.
              </p>
            </div>
          </div>

          {/* Add CRM Deal Form */}
          <form onSubmit={handleAddCrmDeal} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '32px' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">Select Matched Investor</label>
              <select 
                className="form-input" 
                value={selectedInvestorId} 
                onChange={(e) => setSelectedInvestorId(e.target.value)} 
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Select Investor --</option>
                {matchedInvestors.map(m => (
                  <option key={m.target_id} value={m.target_id}>
                    {m.investor_detail?.firm || 'Matched Investor'} ({m.ai_score}% Match)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label className="form-label">Stage</label>
              <select 
                className="form-input" 
                value={crmStage} 
                onChange={(e) => setCrmStage(e.target.value as any)} 
                style={{ width: '100%' }}
              >
                {crmStages.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label className="form-label">Equity Offered (%)</label>
              <input 
                type="number" 
                className="form-input" 
                min={0} max={100} step={0.1}
                value={crmEquity} 
                onChange={(e) => setCrmEquity(parseFloat(e.target.value) || 0)} 
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Next check-in scheduled for next week..."
                value={crmNotes} 
                onChange={(e) => setCrmNotes(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" disabled={savingCrm || !selectedInvestorId} className="btn-primary" style={{ padding: '12px 20px' }}>
              {savingCrm ? '...' : '+ Deal'}
            </button>
          </form>

          {/* CRM Kanban Columns */}
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {crmStages.map(stage => {
              const dealsInStage = crmDeals.filter(d => d.pipeline_stage === stage);
              return (
                <div key={stage} style={{
                  flex: '0 0 260px', backgroundColor: 'rgba(255,255,255,0.01)',
                  borderRadius: '12px', border: '1px solid var(--border-color)',
                  padding: '16px', minHeight: '350px'
                }}>
                  {/* Column Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      {stage.replace('_', ' ')}
                    </h4>
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {dealsInStage.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dealsInStage.map(deal => (
                      <div key={deal.id} style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '12px'
                      }}>
                        <h5 style={{ fontSize: '0.9rem', marginBottom: '2px' }}>
                          {deal.investor_details?.firm || 'Ecosystem Investor'}
                        </h5>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Rep: {deal.investor_details?.name || 'Vetted Allocator'}
                        </p>
                        
                        {deal.notes && (
                          <p style={{
                            fontSize: '0.75rem', color: 'var(--text-secondary)',
                            backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px',
                            borderRadius: '6px', marginBottom: '8px'
                          }}>
                            {deal.notes}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>Equity: <strong>{deal.equity_offered}%</strong></span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {/* Move stage controllers */}
                            {crmStages.indexOf(stage) > 0 && (
                              <button 
                                onClick={() => handleMoveCrmStage(deal, crmStages[crmStages.indexOf(stage) - 1])}
                                style={{ padding: '2px 6px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                ◀
                              </button>
                            )}
                            {crmStages.indexOf(stage) < crmStages.length - 1 && (
                              <button 
                                onClick={() => handleMoveCrmStage(deal, crmStages[crmStages.indexOf(stage) + 1])}
                                style={{ padding: '2px 6px', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <WorkspaceContent />
    </RouteGuard>
  );
}
