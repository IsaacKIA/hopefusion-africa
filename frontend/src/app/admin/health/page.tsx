'use client';

import { useState, useEffect } from 'react';
import { API as apiClient } from '../../../lib/api';

interface HealthData {
  status: string;
  services: {
    database: { status: string; latency_ms: number };
    cache:    { status: string; latency_ms: number };
  };
  system: {
    node_version: string; uptime_seconds: number;
    memory_mb: number; env: string;
  };
  timestamp: string;
}

function StatusCard({ icon, label, status, latency, detail }: {
  icon: string; label: string; status: string; latency?: number; detail?: string;
}) {
  const ok      = status === 'ok';
  const color   = ok ? '#2db562' : status === 'degraded' ? '#f59e0b' : '#ef4444';
  const bgColor = ok ? 'rgba(45,181,98,0.08)' : status === 'degraded' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';

  return (
    <div className="health-card" style={{ borderColor: `${color}33`, background: bgColor }}>
      <div className="health-card-top">
        <span className="health-icon">{icon}</span>
        <span className="health-status-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <p className="health-label">{label}</p>
      <p className="health-status-text" style={{ color }}>{status.toUpperCase()}</p>
      {latency !== undefined && (
        <p className="health-latency">{latency}ms response</p>
      )}
      {detail && <p className="health-detail">{detail}</p>}
    </div>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AdminHealth() {
  const [data, setData]       = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchHealth() {
    setLoading(true);
    try {
      const d = await apiClient.get('/health');
      setData(d);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Health check failed:', err);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const overallOk = data?.status === 'ok';

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 className="admin-page-title">Platform Health</h1>
          <span className="admin-page-sub">Auto-refreshes every 30s · Last: {lastRefresh.toLocaleTimeString()}</span>
        </div>
        <button id="refresh-health" className="refresh-btn" onClick={fetchHealth} disabled={loading}>
          {loading ? '⟳ Checking…' : '⟳ Refresh'}
        </button>
      </div>

      {/* Overall Banner */}
      {data && (
        <div className="overall-banner" style={{ background: overallOk ? 'rgba(45,181,98,0.1)' : 'rgba(239,68,68,0.1)', borderColor: overallOk ? 'rgba(45,181,98,0.3)' : 'rgba(239,68,68,0.3)' }}>
          <span style={{ fontSize: 28 }}>{overallOk ? '✅' : '⚠️'}</span>
          <div>
            <p className="banner-title" style={{ color: overallOk ? '#2db562' : '#ef4444' }}>
              {overallOk ? 'All Systems Operational' : `System ${data.status.toUpperCase()}`}
            </p>
            <p className="banner-sub">Checked at {new Date(data.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      )}

      {/* Service Cards */}
      <div className="health-grid">
        {data && <>
          <StatusCard icon="🗄️" label="Database (Supabase)"
            status={data.services.database.status}
            latency={data.services.database.latency_ms}
            detail="PostgreSQL + pgvector" />
          <StatusCard icon="⚡" label="Cache (Redis / Upstash)"
            status={data.services.cache.status}
            latency={data.services.cache.latency_ms}
            detail="Session + rate limiting" />
          <StatusCard icon="🔌" label="WebSocket (Socket.io)"
            status="ok" detail="Real-time messaging + WebRTC" />
          <StatusCard icon="🤖" label="AI Engine"
            status="degraded" detail="Anthropic credits exhausted" />
        </>}
        {loading && !data && [1,2,3,4].map((i: number) => (
          <div key={i} className="health-card health-skeleton" />
        ))}
      </div>

      {/* System Info */}
      {data?.system && (
        <div className="system-info">
          <p className="section-title">🖥️ System Information</p>
          <div className="sys-grid">
            {[
              { label: 'Node.js',    value: data.system.node_version },
              { label: 'Uptime',     value: formatUptime(data.system.uptime_seconds) },
              { label: 'Memory',     value: `${data.system.memory_mb} MB RSS` },
              { label: 'Environment', value: data.system.env || 'development' },
            ].map(({ label, value }) => (
              <div key={label} className="sys-item">
                <p className="sys-label">{label}</p>
                <p className="sys-value">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .admin-page { max-width: 1000px; }
        .admin-page-header { margin-bottom: 24px; }
        .admin-page-title  { font-size: 26px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
        .admin-page-sub    { font-size: 13px; color: #475569; }

        .refresh-btn {
          background: rgba(45,181,98,0.1); border: 1px solid rgba(45,181,98,0.3);
          color: #2db562; padding: 8px 16px; border-radius: 10px;
          font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.2s;
        }
        .refresh-btn:hover:not(:disabled) { background: rgba(45,181,98,0.2); }
        .refresh-btn:disabled { opacity: 0.5; }

        .overall-banner { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-radius: 16px; border: 1px solid; margin-bottom: 24px; }
        .banner-title { font-size: 18px; font-weight: 700; margin: 0 0 2px; }
        .banner-sub   { font-size: 12px; color: #64748b; margin: 0; }

        .health-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .health-card {
          border: 1px solid rgba(255,255,255,0.07); border-radius: 16px;
          padding: 20px; transition: transform 0.2s;
        }
        .health-card:hover { transform: translateY(-2px); }
        .health-skeleton { background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; min-height: 120px; }
        @keyframes pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }

        .health-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .health-icon { font-size: 28px; }
        .health-status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .health-label        { font-size: 14px; font-weight: 600; color: #e2e8f0; margin: 0 0 4px; }
        .health-status-text  { font-size: 12px; font-weight: 700; margin: 0 0 4px; letter-spacing: .5px; }
        .health-latency      { font-size: 12px; color: #64748b; margin: 0; }
        .health-detail       { font-size: 11px; color: #475569; margin: 4px 0 0; }

        .system-info { background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
        .section-title { font-size: 14px; font-weight: 600; color: #94a3b8; margin: 0 0 16px; }
        .sys-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
        .sys-item  { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 14px; }
        .sys-label { font-size: 11px; color: #64748b; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .5px; }
        .sys-value { font-size: 15px; font-weight: 600; color: #f1f5f9; margin: 0; }
      `}</style>
    </div>
  );
}
