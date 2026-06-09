'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';

function GrantsDashboardContent() {
  const { user } = useAuth();
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [formData, setFormData] = useState({
    grant_name: '',
    grant_org: '',
    grant_amount: 0,
    deadline: '',
    project_title: '',
    problem_stmt: '',
    solution: '',
    funding_plan: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchGrants = async () => {
    try {
      const res = await HFAApi.loadMyGrants();
      if (res?.data) {
        setGrants(res.data);
      }
    } catch (err) {
      console.error('Failed to load grants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grant_name || !formData.grant_org) {
      alert('Please fill in required fields.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      await HFAApi.submitGrantApplication(formData);
      setSuccessMsg('Grant application submitted successfully!');
      setFormData({
        grant_name: '',
        grant_org: '',
        grant_amount: 0,
        deadline: '',
        project_title: '',
        problem_stmt: '',
        solution: '',
        funding_plan: '',
      });
      setApplying(false);
      await fetchGrants(); // reload list
    } catch (err: any) {
      alert(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
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
          <span className="badge badge-green">Grants Hub</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Back to Dashboard
        </Link>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Grant Application Center</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Submit, review, and track development grants for your startup.
            </p>
          </div>
          <button 
            onClick={() => { setApplying(!applying); setSuccessMsg(null); }}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.85rem' }}
          >
            {applying ? 'View My Applications' : 'Apply for a Grant'}
          </button>
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

        {applying ? (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>New Grant Application Form</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Grant Name *</label>
                  <input
                    type="text"
                    name="grant_name"
                    className="form-input"
                    placeholder="e.g. SDG Impact Award"
                    value={formData.grant_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Grant Organization *</label>
                  <input
                    type="text"
                    name="grant_org"
                    className="form-input"
                    placeholder="e.g. United Nations"
                    value={formData.grant_org}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Grant Amount ($ USD)</label>
                  <input
                    type="number"
                    name="grant_amount"
                    className="form-input"
                    placeholder="e.g. 50000"
                    value={formData.grant_amount}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input
                    type="date"
                    name="deadline"
                    className="form-input"
                    value={formData.deadline}
                    onChange={handleChange}
                    style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                <label className="form-label">Project Title</label>
                <input
                  type="text"
                  name="project_title"
                  className="form-input"
                  placeholder="Summarize the project name"
                  value={formData.project_title}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Problem Statement</label>
                <textarea
                  name="problem_stmt"
                  className="form-input"
                  rows={3}
                  placeholder="What local challenge are you solving?"
                  value={formData.problem_stmt}
                  onChange={handleChange}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Solution</label>
                <textarea
                  name="solution"
                  className="form-input"
                  rows={3}
                  placeholder="How does your startup solve this?"
                  value={formData.solution}
                  onChange={handleChange}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" />
          </div>
        ) : grants.length === 0 ? (
          <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No grant applications yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto', marginBottom: '24px' }}>
              Discover available opportunities and apply to scale your local impact.
            </p>
            <button 
              onClick={() => setApplying(true)}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              Apply for Your First Grant
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {grants.map((grant) => (
              <div key={grant.id} className="glass-panel" style={{
                padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{grant.grant_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Organization: <strong>{grant.grant_org}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Amount: <strong style={{ color: 'var(--brand-amber)' }}>${(grant.grant_amount || 0).toLocaleString()} USD</strong></span>
                    <span>Deadline: {grant.deadline ? new Date(grant.deadline).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className={`badge ${grant.status === 'submitted' || grant.status === 'awarded' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.75rem' }}>
                    {grant.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function GrantsDashboardPage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <GrantsDashboardContent />
    </RouteGuard>
  );
}
