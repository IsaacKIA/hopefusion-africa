'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Analytics {
  users: { total: string; startups: string; investors: string; mentors: string; suspended: string; new_30d: string };
  startups: { total: string; total_funding_sought: string; total_funded: string };
  matches: { total: string; avg_score: string; converted: string };
  grants: { total: string; total_awarded: string; awarded: string };
  sessions: { total: string };
  growth: { date: string; count: string }[];
  role_distrib: { role: string; count: string }[];
  match_statuses: { status: string; count: string }[];
  recent_activity: { id: string; action: string; entity: string; first_name: string; last_name: string; created_at: string }[];
}

function KPICard({ icon, label, value, sub, color = '#2db562' }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-box">
      <p className="chart-title">{label}</p>
      <div className="bar-chart">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-fill" style={{ height: `${(d.value / max) * 100}%` }} title={`${d.label}: ${d.value}`} />
            <span className="bar-lbl">{d.label.slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { role: string; count: string }[] }) {
  const colors = { startup: '#2db562', investor: '#3b82f6', mentor: '#f59e0b', admin: '#ef4444' };
  const total = data.reduce((s, d) => s + parseInt(d.count), 0) || 1;
  let offset = 0;
  const slices = data.map(d => {
    const pct = parseInt(d.count) / total;
    const slice = { ...d, pct, offset };
    offset += pct;
    return slice;
  });

  return (
    <div className="chart-box">
      <p className="chart-title">User Roles</p>
      <div className="donut-wrap">
        <svg viewBox="0 0 36 36" className="donut-svg">
          {slices.map((s, i) => {
            const dashArray = `${s.pct * 100} ${100 - s.pct * 100}`;
            const dashOffset = 25 - s.offset * 100;
            return (
              <circle key={i} cx="18" cy="18" r="15.9"
                fill="none" stroke={(colors as any)[s.role] || '#64748b'}
                strokeWidth="3.8" strokeDasharray={dashArray} strokeDashoffset={dashOffset}
              />
            );
          })}
          <text x="18" y="20" textAnchor="middle" fill="#f1f5f9" fontSize="6" fontWeight="bold">{total}</text>
        </svg>
        <div className="donut-legend">
          {slices.map((s, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: (colors as any)[s.role] || '#64748b' }} />
              <span>{s.role}</span>
              <span className="legend-count">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('hfa_token');
    if (!token) return;
    fetch(`${API}/api/v1/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(r => { if (r.success) setData(r.data); else setError(r.error); })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: string | number) => Number(n || 0).toLocaleString();
  const fmtMoney = (n: string | number) => {
    const v = Number(n || 0);
    return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`;
  };

  const growthData = (data?.growth || []).slice(-14).map(g => ({
    label: new Date(g.date).toLocaleDateString('en', { month:'short', day:'numeric' }),
    value: parseInt(g.count),
  }));

  const matchData = (data?.match_statuses || []).map(m => ({ label: m.status, value: parseInt(m.count) }));

  if (loading) return <div className="admin-loading">Loading analytics…</div>;
  if (error)   return <div className="admin-error">⚠️ {error}</div>;
  if (!data)   return null;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Platform Overview</h1>
        <span className="admin-page-sub">Live data · refreshes every 60s</span>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard icon="👥" label="Total Users"     value={fmt(data.users.total)}    sub={`+${data.users.new_30d} this month`} />
        <KPICard icon="🚀" label="Startups"        value={fmt(data.startups.total)} sub={`${fmtMoney(data.startups.total_funded)} raised`} color="#3b82f6" />
        <KPICard icon="💼" label="Investors"       value={fmt(data.users.investors)}sub={`${data.users.mentors} mentors`} color="#f59e0b" />
        <KPICard icon="🎯" label="Total Matches"   value={fmt(data.matches.total)}  sub={`Avg score ${data.matches.avg_score || 0}%`} color="#8b5cf6" />
        <KPICard icon="💰" label="Grants Awarded"  value={fmtMoney(data.grants.total_awarded)} sub={`${data.grants.awarded} applications`} color="#10b981" />
        <KPICard icon="📚" label="Sessions Done"   value={fmt(data.sessions.total)} sub={`${data.matches.converted} deals closed`} color="#ec4899" />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {growthData.length > 0 && (
          <MiniBarChart data={growthData} label="📈 30-Day Signups" />
        )}
        {matchData.length > 0 && (
          <MiniBarChart data={matchData} label="🎯 Match Status Breakdown" />
        )}
        <DonutChart data={data.role_distrib} />
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <p className="section-title">🕐 Recent Activity</p>
        <div className="activity-list">
          {data.recent_activity.length === 0 ? (
            <p className="empty-state">No activity recorded yet</p>
          ) : data.recent_activity.map(a => (
            <div key={a.id} className="activity-row">
              <span className="activity-badge">{a.action.replace(/_/g, ' ')}</span>
              <span className="activity-user">{a.first_name} {a.last_name}</span>
              <span className="activity-entity">{a.entity}</span>
              <span className="activity-time">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-loading { color: #64748b; padding: 60px; text-align: center; font-size: 15px; }
        .admin-error   { color: #ef4444; padding: 40px; text-align: center; }
        .admin-page    { max-width: 1200px; }
        .admin-page-header { margin-bottom: 28px; }
        .admin-page-title { font-size: 26px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
        .admin-page-sub   { font-size: 13px; color: #475569; }

        /* KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .kpi-card {
          background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
          padding: 20px; display: flex; gap: 14px; align-items: flex-start;
          transition: border-color 0.2s, transform 0.2s;
        }
        .kpi-card:hover { border-color: rgba(45,181,98,0.3); transform: translateY(-2px); }
        .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .kpi-label { font-size: 12px; color: #64748b; margin: 0 0 4px; font-weight: 500; }
        .kpi-value { font-size: 22px; font-weight: 700; color: #f1f5f9; margin: 0 0 2px; }
        .kpi-sub   { font-size: 11px; color: #475569; margin: 0; }

        /* Charts */
        .charts-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .chart-box { background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
        .chart-title { font-size: 13px; font-weight: 600; color: #94a3b8; margin: 0 0 16px; }

        .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
        .bar-col   { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
        .bar-fill  { width: 100%; background: linear-gradient(180deg, #2db562, #1a7a3a); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
        .bar-lbl   { font-size: 9px; color: #475569; white-space: nowrap; }

        .donut-wrap { display: flex; align-items: center; gap: 20px; }
        .donut-svg  { width: 100px; height: 100px; transform: rotate(-90deg); flex-shrink: 0; }
        .donut-legend { display: flex; flex-direction: column; gap: 8px; }
        .legend-item  { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
        .legend-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .legend-count { margin-left: auto; font-weight: 600; color: #f1f5f9; padding-left: 12px; }

        /* Activity */
        .activity-section { background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
        .section-title    { font-size: 14px; font-weight: 600; color: #94a3b8; margin: 0 0 16px; }
        .activity-list    { display: flex; flex-direction: column; gap: 8px; }
        .activity-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; background: rgba(255,255,255,0.03);
          border-radius: 10px; font-size: 13px;
        }
        .activity-badge  { background: rgba(45,181,98,0.15); color: #2db562; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; white-space: nowrap; }
        .activity-user   { color: #e2e8f0; font-weight: 500; }
        .activity-entity { color: #64748b; font-size: 12px; }
        .activity-time   { color: #475569; font-size: 11px; margin-left: auto; white-space: nowrap; }
        .empty-state     { color: #475569; text-align: center; padding: 24px; font-size: 14px; }
      `}</style>
    </div>
  );
}
