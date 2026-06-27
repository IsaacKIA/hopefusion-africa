'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/api';
import Link from 'next/link';

import RouteGuard from '../../components/RouteGuard';

function OnboardPageContent() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state values
  const [goals, setGoals] = useState<string[]>([]);
  const [country, setCountry] = useState('Ghana');
  const [roles, setRoles] = useState<string[]>(['startup']);
  
  // Role profile fields
  const [startupName, setStartupName] = useState('');
  const [startupSector, setStartupSector] = useState('fintech');
  const [startupStage, setStartupStage] = useState('idea');
  const [teamSize, setTeamSize] = useState(1);
  
  const [firmName, setFirmName] = useState('');
  const [investorType, setInvestorType] = useState('angel');
  const [ticketMin, setTicketMin] = useState(1000);
  const [ticketMax, setTicketMax] = useState(50000);

  const [expertise, setExpertise] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [experienceYears, setExperienceYears] = useState(1);
  const [mentorBio, setMentorBio] = useState('');

  const [sectors, setSectors] = useState<string[]>([]);

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const toggleRole = (r: string) => {
    if (roles.includes(r)) {
      if (roles.length > 1) {
        setRoles(roles.filter(role => role !== r));
      }
    } else {
      setRoles([...roles, r]);
    }
  };

  const toggleSector = (sec: string) => {
    if (sectors.includes(sec)) {
      setSectors(sectors.filter(s => s !== sec));
    } else {
      setSectors([...sectors, sec]);
    }
  };

  const nextStep = () => {
    if (step === 1 && goals.length === 0) {
      setError('Please select at least one goal to proceed.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      goals,
      country,
      roles,
      // startup fields
      ...(roles.includes('startup') && {
        startup_name: startupName || `${user?.first_name}'s Startup`,
        sector: startupSector,
        stage: startupStage,
        team_size: teamSize,
      }),
      // investor fields
      ...(roles.includes('investor') && {
        firm_name: firmName,
        investor_type: investorType,
        ticket_min: ticketMin,
        ticket_max: ticketMax,
      }),
      // mentor fields
      ...(roles.includes('mentor') && {
        expertise,
        languages,
        experience_years: experienceYears,
        mentor_bio: mentorBio,
      }),
      // interests sectors
      sectors,
    };

    try {
      const res = await API.post('/auth/onboard', payload);
      if (res?.success) {
        await refreshProfile();
        router.replace('/dashboard');
      } else {
        setError(res?.error || 'Failed to complete onboarding.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Verification update failed.');
      setLoading(false);
    }
  };

  const availableGoals = [
    'Raise Funding',
    'Find Grants',
    'Find Mentors',
    'Find Opportunities',
    'Hire Talent',
    'Learn Entrepreneurship',
    'Invest in Startups',
    'Support Entrepreneurs'
  ];

  const countries = ['Ghana', 'Nigeria', 'Kenya', 'Egypt', 'South Africa', 'Rwanda'];
  
  const roleOptions = [
    { value: 'startup', label: 'Startup Founder' },
    { value: 'investor', label: 'Ecosystem Investor' },
    { value: 'mentor', label: 'Professional Mentor' },
    { value: 'student', label: 'Ecosystem Student' },
    { value: 'corporate', label: 'Corporate Innovation Partner' },
    { value: 'government', label: 'Government Officer' },
    { value: 'service_provider', label: 'Service Provider' },
  ];

  const sectorOptions = ['fintech', 'agritech', 'healthtech', 'cleantech', 'edtech', 'logistics', 'e-commerce', 'ai'];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '40px 24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Home
          </Link>
        </div>
        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <span>Step {step} of 6</span>
          <span>{Math.round((step / 6) * 100)}% Completed</span>
        </div>
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '2px', marginBottom: '32px' }}>
          <div style={{ width: `${(step / 6) * 100}%`, height: '100%', backgroundColor: 'var(--brand-green)', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* STEP 1: GOAL FIRST ONBOARDING */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>What brings you to HopeFusion today?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Select all items that match your objectives. We will personalize your dashboard recommendations.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '32px' }}>
              {availableGoals.map((g) => {
                const selected = goals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGoal(g)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `1px solid ${selected ? 'var(--brand-green)' : 'rgba(255,255,255,0.08)'}`,
                      backgroundColor: selected ? 'rgba(45,181,98,0.08)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: COUNTRY SELECTION */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Choose your active country</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>We align opportunities and compliance rules with your selected region.</p>
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Ecosystem Base Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="form-input"
                style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: ROLE EXPANSION SELECTION */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Select profile types</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Confirm your capabilities. You can select multiple roles to unlock different dashboard modules.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '32px' }}>
              {roleOptions.map((opt) => {
                const selected = roles.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleRole(opt.value)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${selected ? 'var(--brand-green)' : 'rgba(255,255,255,0.06)'}`,
                      backgroundColor: selected ? 'rgba(45,181,98,0.08)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{opt.label}</span>
                    {selected && <span style={{ color: 'var(--brand-green)', fontWeight: 'bold' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: DETAILED PROFILE QUESTIONS */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Complete Profile Details</h2>
            
            {/* Startup form items */}
            {roles.includes('startup') && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brand-green)', marginBottom: '16px' }}>Founder details</h3>
                <div className="form-group">
                  <label className="form-label">Startup/Company Name</label>
                  <input type="text" className="form-input" placeholder="e.g. HopePay" value={startupName} onChange={e => setStartupName(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Sector</label>
                    <select value={startupSector} onChange={e => setStartupSector(e.target.value)} className="form-input" style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}>
                      {sectorOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Funding Stage</label>
                    <select value={startupStage} onChange={e => setStartupStage(e.target.value)} className="form-input" style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}>
                      <option value="idea">Idea/Pre-seed</option>
                      <option value="mvp">MVP/Pre-revenue</option>
                      <option value="early_traction">Early Traction</option>
                      <option value="growth">Growth/Series A+</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Team headcount</label>
                  <input type="number" min={1} className="form-input" value={teamSize} onChange={e => setTeamSize(parseInt(e.target.value) || 1)} />
                </div>
              </div>
            )}

            {/* Investor form items */}
            {roles.includes('investor') && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brand-green)', marginBottom: '16px' }}>Investor profile</h3>
                <div className="form-group">
                  <label className="form-label">Firm/Syndicate Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Savannah Ventures" value={firmName} onChange={e => setFirmName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Investor category</label>
                  <select value={investorType} onChange={e => setInvestorType(e.target.value)} className="form-input" style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}>
                    <option value="angel">Angel Investor</option>
                    <option value="vc">Venture Capital Fund</option>
                    <option value="accelerator">Incubator / Accelerator</option>
                    <option value="government">Government Agency</option>
                    <option value="corporate">Corporate Venture arm</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Min Ticket (USD)</label>
                    <input type="number" step={1000} className="form-input" value={ticketMin} onChange={e => setTicketMin(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Ticket (USD)</label>
                    <input type="number" step={5000} className="form-input" value={ticketMax} onChange={e => setTicketMax(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            )}

            {/* Mentor form items */}
            {roles.includes('mentor') && (
              <div style={{ paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brand-green)', marginBottom: '16px' }}>Mentor credentials</h3>
                <div className="form-group">
                  <label className="form-label">Mentor bio summary</label>
                  <textarea className="form-input" placeholder="Experienced engineering manager specializing in scaling cloud platforms..." value={mentorBio} onChange={e => setMentorBio(e.target.value)} style={{ minHeight: '80px', fontFamily: 'inherit', padding: '10px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Experience (years)</label>
                    <input type="number" className="form-input" value={experienceYears} onChange={e => setExperienceYears(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expertise (e.g. Sales, Scaling)</label>
                    <input type="text" className="form-input" placeholder="comma separated" onChange={e => setExpertise(e.target.value.split(',').map(s => s.trim()))} />
                  </div>
                </div>
              </div>
            )}

            {/* Default role fallbacks placeholder */}
            {!roles.includes('startup') && !roles.includes('investor') && !roles.includes('mentor') && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ecosystem Students, Corporates, Government and Service Providers can click next to finalize general info.</p>
            )}
          </div>
        )}

        {/* STEP 5: SECTOR INTEREST SELECTION */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Select interest sectors</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>We match custom deals and alerts aligned with these industries.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
              {sectorOptions.map((sec) => {
                const selected = sectors.includes(sec);
                return (
                  <button
                    key={sec}
                    onClick={() => toggleSector(sec)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${selected ? 'var(--brand-green)' : 'rgba(255,255,255,0.06)'}`,
                      backgroundColor: selected ? 'rgba(45,181,98,0.08)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {sec.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: FINALIZE ONBOARDING */}
        {step === 6 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>Ready to Launch!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '40px', lineHeight: '22px' }}>
              Your HopeScore™ Trust profile is complete. Click finish to open your dashboard.
            </p>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}
            >
              {loading ? <div className="spinner" style={{ width: '24px', height: '24px' }} /> : 'Finish & Open Dashboard'}
            </button>
            <button
              onClick={prevStep}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Go back and edit
            </button>
          </div>
        )}

        {/* Wizard Controls */}
        {step < 6 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
            {step > 1 ? (
              <button onClick={prevStep} style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Back
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Skip wizard
              </button>

              <button
                onClick={nextStep}
                className="btn-primary"
                style={{ padding: '12px 24px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <RouteGuard>
      <OnboardPageContent />
    </RouteGuard>
  );
}
