'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API, HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useMounted } from '../../hooks/useMounted';
import DashboardLayout from '../../components/DashboardLayout';

interface Startup {
  id: string;
  name: string;
  sector: string;
  country: string;
  stage: string;
  is_verified: boolean;
  is_registered_incorporation: boolean;
  registry_number?: string;
  incorporation_country?: string;
  headcount?: number;
  startup_node_id?: string;
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
  startup_name?: string;
  milestones: EscrowMilestone[];
}

interface SMEAnalytics {
  total_startups: number;
  total_registered_corporations: number;
  avg_headcount: string;
  avg_female_representation: string;
  avg_youth_representation: string;
  sectors: { sector: string; count: number }[];
}

export default function PortalsDashboard() {
  const { user, logout, refreshProfile } = useAuth();
  const mounted = useMounted();
  
  // Tab switcher: 'thesis' | 'government' | 'corporate'
  const [activeTab, setActiveTab] = useState<'thesis' | 'government' | 'corporate'>('thesis');

  // Thesis details state
  const [editingThesis, setEditingThesis] = useState(false);
  const [thesisForm, setThesisForm] = useState({
    firm_name: '',
    investor_type: 'vc',
    thesis: '',
    ticket_min: 0,
    ticket_max: 0,
  });
  const [savingThesis, setSavingThesis] = useState(false);

  // Government & Corporate common listings
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(false);

  // Government Portal states
  const [govAnalytics, setGovAnalytics] = useState<SMEAnalytics | null>(null);
  const [govEscrows, setGovEscrows] = useState<EscrowContract[]>([]);
  const [loadingGov, setLoadingGov] = useState(false);

  // Corporate Portal states
  const [corpEscrows, setCorpEscrows] = useState<EscrowContract[]>([]);
  const [loadingCorp, setLoadingCorp] = useState(false);

  // Opportunity publish states (Grant / Challenge)
  const [publishingOpp, setPublishingOpp] = useState(false);
  const [oppForm, setOppForm] = useState({
    title: '',
    description: '',
    value_amount: 50000,
    currency: 'USD',
    eligible_countries: 'KE, NG, ZA',
    eligible_sectors: 'Agriculture, Fintech, Health',
    eligible_stages: 'mvp, early_traction',
    deadline: '2026-12-31',
    agency: '',
    host: ''
  });

  // Disbursement Escrow states
  const [creatingEscrow, setCreatingEscrow] = useState(false);
  const [escrowForm, setEscrowForm] = useState({
    deal_id: '',
    startup_node_id: '',
    total_amount: 10000,
    currency: 'USD',
    escrow_type: 'MOBILE_MONEY' as 'MATIC' | 'ERC20' | 'MOBILE_MONEY' | 'CARD',
    investor_node_id: '77777777-7777-4777-8777-777777777777', // Default mock UUID
    arbitrator_node_id: '66666666-6666-4666-8666-666666666666', // Default mock UUID
  });

  // Milestone list state for escrow creator
  const [milestones, setMilestones] = useState<{ title: string; amount: number }[]>([
    { title: 'Milestone 1: Prototype Delivered', amount: 5000 },
    { title: 'Milestone 2: Production Release', amount: 5000 },
  ]);

  // Set default tab on mount based on user profile
  useEffect(() => {
    if (user?.investor_profile) {
      setThesisForm({
        firm_name: user.investor_profile.firm_name || '',
        investor_type: user.investor_profile.investor_type || 'vc',
        thesis: user.investor_profile.thesis || '',
        ticket_min: user.investor_profile.ticket_min || 0,
        ticket_max: user.investor_profile.ticket_max || 0,
      });

      const type = user.investor_profile.investor_type;
      if (type === 'government') {
        setActiveTab('government');
      } else if (type === 'corporate') {
        setActiveTab('corporate');
      } else {
        setActiveTab('thesis');
      }
    } else if (user?.role === 'government') {
      setActiveTab('government');
    } else if (user?.role === 'corporate') {
      setActiveTab('corporate');
    } else if (user?.role === 'admin') {
      setActiveTab('government');
    }
  }, [user]);

  // Fetch relevant data depending on active tab
  useEffect(() => {
    if (activeTab === 'government') {
      fetchGovData();
    } else if (activeTab === 'corporate') {
      fetchCorpData();
    }
  }, [activeTab]);

  const fetchGovData = async () => {
    setLoadingGov(true);
    setLoadingStartups(true);
    try {
      const [analyticsRes, startupsRes, escrowsRes] = await Promise.all([
        API.get('/government/analytics'),
        API.get('/government/startups'),
        API.get('/government/escrows'),
      ]);

      if (analyticsRes?.success) setGovAnalytics(analyticsRes.data);
      if (startupsRes?.success) setStartups(startupsRes.data);
      if (escrowsRes?.success) setGovEscrows(escrowsRes.data);
    } catch (err) {
      console.error('Failed to load government workspace data:', err);
    } finally {
      setLoadingGov(false);
      setLoadingStartups(false);
    }
  };

  const fetchCorpData = async () => {
    setLoadingCorp(true);
    setLoadingStartups(true);
    try {
      const [startupsRes, escrowsRes] = await Promise.all([
        API.get('/government/startups'),
        API.get('/corporate/escrows'),
      ]);

      if (startupsRes?.success) setStartups(startupsRes.data);
      if (escrowsRes?.success) setCorpEscrows(escrowsRes.data);
    } catch (err) {
      console.error('Failed to load corporate workspace data:', err);
    } finally {
      setLoadingCorp(false);
      setLoadingStartups(false);
    }
  };

  const handleSaveThesis = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThesis(true);
    try {
      await HFAApi.updateInvestor(thesisForm);
      await refreshProfile();
      alert('Thesis details updated successfully!');
      setEditingThesis(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update thesis.');
    } finally {
      setSavingThesis(false);
    }
  };

  const handlePublishOpportunity = async (type: 'grant' | 'challenge') => {
    setPublishingOpp(true);
    try {
      const countries = oppForm.eligible_countries.split(',').map(s => s.trim().toUpperCase());
      const sectors = oppForm.eligible_sectors.split(',').map(s => s.trim());
      const stages = oppForm.eligible_stages.split(',').map(s => s.trim());

      if (type === 'grant') {
        const payload = {
          title: oppForm.title,
          description: oppForm.description,
          value_amount: oppForm.value_amount,
          currency: oppForm.currency,
          eligible_countries: countries,
          eligible_sectors: sectors,
          eligible_stages: stages,
          deadline: oppForm.deadline ? new Date(oppForm.deadline).toISOString() : null,
          metadata: { agency: oppForm.agency || 'Ministry of Finance' }
        };
        await API.post('/government/grants', payload);
        alert('Government Grant Program published successfully!');
        fetchGovData();
      } else {
        const payload = {
          title: oppForm.title,
          description: oppForm.description,
          value_amount: oppForm.value_amount,
          currency: oppForm.currency,
          eligible_countries: countries,
          eligible_sectors: sectors,
          eligible_stages: stages,
          deadline: oppForm.deadline ? new Date(oppForm.deadline).toISOString() : null,
          metadata: { host: oppForm.host || 'Enterprise Lab' }
        };
        await API.post('/corporate/challenges', payload);
        alert('Corporate Challenge Opportunity published successfully!');
        fetchCorpData();
      }

      // Reset form
      setOppForm({
        title: '',
        description: '',
        value_amount: 50000,
        currency: 'USD',
        eligible_countries: 'KE, NG, ZA',
        eligible_sectors: 'Agriculture, Fintech, Health',
        eligible_stages: 'mvp, early_traction',
        deadline: '2026-12-31',
        agency: '',
        host: ''
      });
    } catch (err: any) {
      alert(err.message || 'Failed to publish opportunity.');
    } finally {
      setPublishingOpp(false);
    }
  };

  const handleAddMilestoneInput = () => {
    setMilestones([...milestones, { title: '', amount: 0 }]);
  };

  const handleRemoveMilestoneInput = (index: number) => {
    const updated = [...milestones];
    updated.splice(index, 1);
    setMilestones(updated);
  };

  const handleMilestoneValueChange = (index: number, field: 'title' | 'amount', val: any) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? parseFloat(val) || 0 : val
    };
    setMilestones(updated);
  };

  const handleDisburseEscrow = async (type: 'government' | 'corporate') => {
    const sum = milestones.reduce((acc, m) => acc + m.amount, 0);
    if (Math.abs(sum - escrowForm.total_amount) > 0.01) {
      alert(`Milestones sum ($${sum.toLocaleString()}) must exactly match total disburse amount ($${escrowForm.total_amount.toLocaleString()}).`);
      return;
    }

    if (!escrowForm.startup_node_id) {
      alert('Please select a target startup.');
      return;
    }

    setCreatingEscrow(true);
    try {
      const endpoint = type === 'government' ? '/government/disburse' : '/corporate/escrow/create';
      const payload = {
        deal_id: escrowForm.deal_id,
        startup_node_id: escrowForm.startup_node_id,
        investor_node_id: escrowForm.investor_node_id,
        total_amount: escrowForm.total_amount,
        currency: escrowForm.currency,
        escrow_type: escrowForm.escrow_type,
        arbitrator_node_id: escrowForm.arbitrator_node_id,
        milestones: milestones.map(m => ({ title: m.title, amount: m.amount }))
      };

      await API.post(endpoint, payload);
      alert('Escrow deal payout disbursed successfully!');
      
      // Reset forms
      setEscrowForm({
        deal_id: '',
        startup_node_id: '',
        total_amount: 10000,
        currency: 'USD',
        escrow_type: 'MOBILE_MONEY',
        investor_node_id: '77777777-7777-4777-8777-777777777777',
        arbitrator_node_id: '66666666-6666-4666-8666-666666666666',
      });
      setMilestones([
        { title: 'Milestone 1: Prototype Delivered', amount: 5000 },
        { title: 'Milestone 2: Production Release', amount: 5000 },
      ]);

      if (type === 'government') fetchGovData();
      else fetchCorpData();
    } catch (err: any) {
      alert(err.message || 'Failed to create escrow contract.');
    } finally {
      setCreatingEscrow(false);
    }
  };

  const handleMilestoneAction = async (escrowId: string, milestoneId: string, action: 'approve' | 'reject') => {
    try {
      const res = await API.post(`/corporate/escrow/${escrowId}/milestone/${milestoneId}/${action}`);
      if (res?.success) {
        alert(`Milestone successfully ${action === 'approve' ? 'approved & payout released' : 'rejected'}.`);
        if (activeTab === 'government') fetchGovData();
        else fetchCorpData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute milestone status change.');
    }
  };

  const isAdmin = user?.role === 'admin';
  const investorType = user?.investor_profile?.investor_type;

  return (
    <RouteGuard allowedRoles={['investor', 'admin', 'government', 'corporate']}>
      <DashboardLayout>
          
          {/* Header Card */}
          <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
                {mounted ? (user?.investor_profile?.firm_name || `${user?.first_name ?? ''}'s Workspace`) : ''}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Manage investments, audit registered startups, and release milestone-locked contract payouts.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/matching" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                🤖 Search SME Profiles
              </Link>
            </div>
          </div>

          {/* Segment/Tab Switcher */}
          <div style={{
            display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)',
            marginBottom: '32px', paddingBottom: '12px'
          }}>
            {(isAdmin || investorType === 'government') && (
              <button
                className={`tab-btn ${activeTab === 'government' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab('government')}
              >
                🏛 Government Portal
              </button>
            )}

            {(isAdmin || investorType === 'corporate') && (
              <button
                className={`tab-btn ${activeTab === 'corporate' ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab('corporate')}
              >
                🏢 Corporate Portal
              </button>
            )}

            <button
              className={`tab-btn ${activeTab === 'thesis' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('thesis')}
            >
              📊 Thesis & Profile
            </button>
          </div>

          {/* ==================== GOVERNMENT PORTAL TAB ==================== */}
          {activeTab === 'government' && (
            <div className="fade-in">
              
              {/* Analytics SME grid */}
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>SME National Analytics</h2>
              {loadingGov ? <div className="spinner" style={{ margin: '32px auto' }} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <div className="glass-panel analytics-card">
                    <span className="card-label">SME Registered</span>
                    <strong className="card-value">{govAnalytics?.total_startups || 0}</strong>
                  </div>
                  <div className="glass-panel analytics-card">
                    <span className="card-label">Incorporated Corps</span>
                    <strong className="card-value">{govAnalytics?.total_registered_corporations || 0}</strong>
                  </div>
                  <div className="glass-panel analytics-card">
                    <span className="card-label">Avg Headcount</span>
                    <strong className="card-value">{govAnalytics?.avg_headcount || '0.0'}</strong>
                  </div>
                  <div className="glass-panel analytics-card">
                    <span className="card-label">Avg Female Rep</span>
                    <strong className="card-value" style={{ color: 'var(--brand-green)' }}>
                      {govAnalytics?.avg_female_representation || '0.0'}%
                    </strong>
                  </div>
                  <div className="glass-panel analytics-card">
                    <span className="card-label">Avg Youth Rep</span>
                    <strong className="card-value" style={{ color: 'var(--brand-amber)' }}>
                      {govAnalytics?.avg_youth_representation || '0.0'}%
                    </strong>
                  </div>
                </div>
              )}

              {/* Action Forms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px', marginBottom: '48px' }} className="workspace-double-col">
                
                {/* Publish Grant form */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Publish National Grant Program</h3>
                  <div className="form-group">
                    <label className="form-label">Program Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="National Agritech Dev Fund"
                      value={oppForm.title}
                      onChange={e => setOppForm({ ...oppForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Describe target outcomes and non-dilutive milestones..."
                      value={oppForm.description}
                      onChange={e => setOppForm({ ...oppForm, description: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Funding Limit ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={oppForm.value_amount}
                        onChange={e => setOppForm({ ...oppForm, value_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-input"
                        value={oppForm.currency}
                        onChange={e => setOppForm({ ...oppForm, currency: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Countries (Comma Separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_countries}
                      onChange={e => setOppForm({ ...oppForm, eligible_countries: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Sectors (Comma Separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_sectors}
                      onChange={e => setOppForm({ ...oppForm, eligible_sectors: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Stages (e.g. mvp, scaling)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_stages}
                      onChange={e => setOppForm({ ...oppForm, eligible_stages: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Deadline</label>
                      <input
                        type="date"
                        className="form-input"
                        value={oppForm.deadline}
                        onChange={e => setOppForm({ ...oppForm, deadline: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gov Agency</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ministry of Agriculture"
                        value={oppForm.agency}
                        onChange={e => setOppForm({ ...oppForm, agency: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    disabled={publishingOpp || !oppForm.title}
                    onClick={() => handlePublishOpportunity('grant')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {publishingOpp ? 'Publishing...' : 'Publish Grant Program'}
                  </button>
                </div>

                {/* Disburse Escrow form */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Escrow Capital Disbursal</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Deal ID / Contract Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="agri-grant-2026-01"
                        value={escrowForm.deal_id}
                        onChange={e => setEscrowForm({ ...escrowForm, deal_id: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payout Channel</label>
                      <select
                        className="form-input"
                        value={escrowForm.escrow_type}
                        onChange={e => setEscrowForm({ ...escrowForm, escrow_type: e.target.value as any })}
                        style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <option value="MOBILE_MONEY">Mobile Money Gateway</option>
                        <option value="CARD">Debit Card Release</option>
                        <option value="MATIC">MATIC Escrow Node</option>
                        <option value="ERC20">ERC20 Escrow Token</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Startup SME</label>
                    <select
                      className="form-input"
                      value={escrowForm.startup_node_id}
                      onChange={e => setEscrowForm({ ...escrowForm, startup_node_id: e.target.value })}
                      style={{ color: 'white', backgroundColor: 'var(--bg-secondary)', width: '100%' }}
                    >
                      <option value="">-- Select Startup --</option>
                      {startups.map(s => (
                        <option key={s.id} value={s.startup_node_id}>
                          {s.name} ({s.country} · {s.stage.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Total Escrow Amount ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={escrowForm.total_amount}
                        onChange={e => setEscrowForm({ ...escrowForm, total_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-input"
                        value={escrowForm.currency}
                        onChange={e => setEscrowForm({ ...escrowForm, currency: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Dynamic Milestones Inputs */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="form-label" style={{ marginBottom: 0 }}>Milestone Disbursements List</span>
                      <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddMilestoneInput}>
                        + Add Milestone
                      </button>
                    </div>
                    {milestones.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, marginBottom: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                          placeholder={`Milestone ${idx + 1} goal...`}
                          value={m.title}
                          onChange={e => handleMilestoneValueChange(idx, 'title', e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input"
                          style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                          placeholder="Amount"
                          value={m.amount}
                          onChange={e => handleMilestoneValueChange(idx, 'amount', e.target.value)}
                        />
                        {milestones.length > 1 && (
                          <button type="button" style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => handleRemoveMilestoneInput(idx)}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '4px' }}>
                      Total sum: <strong>${milestones.reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    disabled={creatingEscrow || !escrowForm.startup_node_id || !escrowForm.deal_id}
                    onClick={() => handleDisburseEscrow('government')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {creatingEscrow ? 'Deploying Escrow...' : 'Deploy Payout Escrow'}
                  </button>
                </div>
              </div>

              {/* Disbursed Escrows list */}
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Active Disbursed Grants & Milestones</h2>
              {loadingGov ? <div className="spinner" /> : govEscrows.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No active grant escrow disbursements logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {govEscrows.map(escrow => (
                    <div key={escrow.id} className="glass-panel" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{escrow.deal_id}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Target SME: <strong>{escrow.startup_name || 'Vetted Startup'}</strong> · Escrow Type: <strong>{escrow.escrow_type}</strong>
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-amber)' }}>
                            ${escrow.total_amount.toLocaleString()} {escrow.currency}
                          </span>
                          <span className={`badge ${escrow.status === 'completed' ? 'badge-green' : 'badge-amber'}`} style={{ display: 'block', marginTop: '4px', fontSize: '0.65rem' }}>
                            {escrow.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Milestones */}
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px' }}>
                        <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Disbursal Milestones</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {escrow.milestones?.map((m, index) => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: index < escrow.milestones.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingBottom: '6px' }}>
                              <div style={{ flex: 1, marginRight: '16px' }}>
                                <span style={{ fontSize: '0.85rem' }}>{m.title}</span>
                                {m.evidence_uri && (
                                  <a href={m.evidence_uri} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'underline', marginTop: '2px' }}>
                                    View Validation Evidence
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>${m.amount.toLocaleString()}</span>
                                <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'submitted' ? 'badge-amber' : m.status === 'rejected' ? 'badge-red' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                  {m.status.toUpperCase()}
                                </span>
                                
                                {m.status === 'submitted' && (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleMilestoneAction(escrow.id, m.id, 'approve')}>
                                      Release
                                    </button>
                                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleMilestoneAction(escrow.id, m.id, 'reject')}>
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== CORPORATE PORTAL TAB ==================== */}
          {activeTab === 'corporate' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px', marginBottom: '48px' }} className="workspace-double-col">
                
                {/* Publish Challenge form */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Create Corporate Challenge Opportunity</h3>
                  <div className="form-group">
                    <label className="form-label">Challenge Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="API Payment Orchestration Challenge"
                      value={oppForm.title}
                      onChange={e => setOppForm({ ...oppForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Describe the problem, target deliverables, and prize/contract details..."
                      value={oppForm.description}
                      onChange={e => setOppForm({ ...oppForm, description: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Challenge Value ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={oppForm.value_amount}
                        onChange={e => setOppForm({ ...oppForm, value_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-input"
                        value={oppForm.currency}
                        onChange={e => setOppForm({ ...oppForm, currency: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Countries (Comma Separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_countries}
                      onChange={e => setOppForm({ ...oppForm, eligible_countries: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Sectors (Comma Separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_sectors}
                      onChange={e => setOppForm({ ...oppForm, eligible_sectors: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Eligible Stages (Comma Separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={oppForm.eligible_stages}
                      onChange={e => setOppForm({ ...oppForm, eligible_stages: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Deadline</label>
                      <input
                        type="date"
                        className="form-input"
                        value={oppForm.deadline}
                        onChange={e => setOppForm({ ...oppForm, deadline: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Host Corporate</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Standard Bank Group"
                        value={oppForm.host}
                        onChange={e => setOppForm({ ...oppForm, host: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    disabled={publishingOpp || !oppForm.title}
                    onClick={() => handlePublishOpportunity('challenge')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {publishingOpp ? 'Creating...' : 'Create Challenge'}
                  </button>
                </div>

                {/* Create Escrow form */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Procurement Escrow Creator</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Deal / Contract Ref</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="procure-sme-2026-b"
                        value={escrowForm.deal_id}
                        onChange={e => setEscrowForm({ ...escrowForm, deal_id: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Escrow Ledger Type</label>
                      <select
                        className="form-input"
                        value={escrowForm.escrow_type}
                        onChange={e => setEscrowForm({ ...escrowForm, escrow_type: e.target.value as any })}
                        style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <option value="MOBILE_MONEY">Mobile Money Gateway</option>
                        <option value="CARD">Card Gateway Release</option>
                        <option value="MATIC">MATIC Escrow Contract</option>
                        <option value="ERC20">ERC20 Escrow Node</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">SME Contractor</label>
                    <select
                      className="form-input"
                      value={escrowForm.startup_node_id}
                      onChange={e => setEscrowForm({ ...escrowForm, startup_node_id: e.target.value })}
                      style={{ color: 'white', backgroundColor: 'var(--bg-secondary)', width: '100%' }}
                    >
                      <option value="">-- Select Startup --</option>
                      {startups.map(s => (
                        <option key={s.id} value={s.startup_node_id}>
                          {s.name} ({s.country} · {s.stage.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Total Escrow Value ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={escrowForm.total_amount}
                        onChange={e => setEscrowForm({ ...escrowForm, total_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-input"
                        value={escrowForm.currency}
                        onChange={e => setEscrowForm({ ...escrowForm, currency: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Dynamic Milestones */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="form-label" style={{ marginBottom: 0 }}>Procurement Milestones</span>
                      <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleAddMilestoneInput}>
                        + Add Milestone
                      </button>
                    </div>
                    {milestones.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, marginBottom: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                          placeholder={`Milestone ${idx + 1} target...`}
                          value={m.title}
                          onChange={e => handleMilestoneValueChange(idx, 'title', e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input"
                          style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: '0.8rem' }}
                          placeholder="Amount"
                          value={m.amount}
                          onChange={e => handleMilestoneValueChange(idx, 'amount', e.target.value)}
                        />
                        {milestones.length > 1 && (
                          <button type="button" style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }} onClick={() => handleRemoveMilestoneInput(idx)}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '4px' }}>
                      Total sum: <strong>${milestones.reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    disabled={creatingEscrow || !escrowForm.startup_node_id || !escrowForm.deal_id}
                    onClick={() => handleDisburseEscrow('corporate')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {creatingEscrow ? 'Creating Escrow...' : 'Deploy Procurement Escrow'}
                  </button>
                </div>
              </div>

              {/* Active corporate escrows */}
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Active Procurement Escrows & Milestone Releases</h2>
              {loadingCorp ? <div className="spinner" /> : corpEscrows.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No active procurement escrows created.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {corpEscrows.map(escrow => (
                    <div key={escrow.id} className="glass-panel" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{escrow.deal_id}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Contractor: <strong>{escrow.startup_name || 'Vetted SME'}</strong> · Escrow: <strong>{escrow.escrow_type}</strong>
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-amber)' }}>
                            ${escrow.total_amount.toLocaleString()} {escrow.currency}
                          </span>
                          <span className={`badge ${escrow.status === 'completed' ? 'badge-green' : 'badge-amber'}`} style={{ display: 'block', marginTop: '4px', fontSize: '0.65rem' }}>
                            {escrow.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Milestones */}
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px' }}>
                        <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Procurement Milestones</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {escrow.milestones?.map((m, index) => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: index < escrow.milestones.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingBottom: '6px' }}>
                              <div style={{ flex: 1, marginRight: '16px' }}>
                                <span style={{ fontSize: '0.85rem' }}>{m.title}</span>
                                {m.evidence_uri && (
                                  <a href={m.evidence_uri} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--brand-green)', textDecoration: 'underline', marginTop: '2px' }}>
                                    View Evidence URL
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>${m.amount.toLocaleString()}</span>
                                <span className={`badge ${m.status === 'approved' ? 'badge-green' : m.status === 'submitted' ? 'badge-amber' : m.status === 'rejected' ? 'badge-red' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                  {m.status.toUpperCase()}
                                </span>
                                
                                {m.status === 'submitted' && (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleMilestoneAction(escrow.id, m.id, 'approve')}>
                                      Approve
                                    </button>
                                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleMilestoneAction(escrow.id, m.id, 'reject')}>
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== THESIS & PROFILE TAB ==================== */}
          {activeTab === 'thesis' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="workspace-double-col">
                
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem' }}>Thesis Details</h2>
                    <button 
                      onClick={() => setEditingThesis(!editingThesis)}
                      className="btn-secondary"
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                    >
                      {editingThesis ? 'Cancel' : 'Edit Thesis'}
                    </button>
                  </div>

                  {editingThesis ? (
                    <form onSubmit={handleSaveThesis}>
                      <div className="form-group">
                        <label className="form-label">Firm Name</label>
                        <input
                          type="text"
                          name="firm_name"
                          className="form-input"
                          value={thesisForm.firm_name}
                          onChange={e => setThesisForm({ ...thesisForm, firm_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Investor Type</label>
                        <select
                          name="investor_type"
                          className="form-input"
                          value={thesisForm.investor_type}
                          onChange={e => setThesisForm({ ...thesisForm, investor_type: e.target.value })}
                          style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <option value="angel">Angel Investor</option>
                          <option value="vc">Venture Capital (VC)</option>
                          <option value="impact">Impact Fund</option>
                          <option value="family_office">Family Office</option>
                          <option value="government">Government Fund</option>
                          <option value="corporate">Corporate Allocator</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Thesis Summary</label>
                        <textarea
                          name="thesis"
                          className="form-input"
                          rows={4}
                          value={thesisForm.thesis}
                          onChange={e => setThesisForm({ ...thesisForm, thesis: e.target.value })}
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
                            value={thesisForm.ticket_min}
                            onChange={e => setThesisForm({ ...thesisForm, ticket_min: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Ticket ($ USD)</label>
                          <input
                            type="number"
                            name="ticket_max"
                            className="form-input"
                            value={thesisForm.ticket_max}
                            onChange={e => setThesisForm({ ...thesisForm, ticket_max: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={savingThesis}
                        style={{ marginTop: '12px' }}
                      >
                        {savingThesis ? 'Saving...' : 'Save Updates'}
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
            </div>
          )}

      <style jsx global>{`
        .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          font-size: 0.9rem;
          border-radius: 8px;
        }
        .tab-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.03);
        }
        .tab-btn-active {
          color: var(--brand-green) !important;
          background: rgba(45, 181, 98, 0.08) !important;
          font-weight: 700;
        }
        .analytics-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid var(--border-color);
        }
        .card-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }
        .card-value {
          font-size: 1.75rem;
          font-weight: 800;
          font-family: Outfit;
        }
        @media(max-width: 768px) {
          .workspace-double-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      </DashboardLayout>
    </RouteGuard>
  );
}
