'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const ACTION_COLORS: Record<string, string> = {
  user_suspended: '#ef4444', user_activated: '#2db562', user_deleted: '#f97316',
  login: '#3b82f6', register: '#8b5cf6', payment_initialized: '#10b981',
  escrow_release: '#f59e0b', match_created: '#2db562',
};

function getActionColor(action: string) {
  return ACTION_COLORS[action] || '#64748b';
}

interface Activity {
  id: string; action: string; entity: string; entity_id: string;
  ip_address: string; created_at: string;
  first_name: string; last_name: string; email: string; role: string;
  metadata: Record<string, unknown>;
}

export default function AdminActivity() {
  const [items, setItems]     = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [action, setAction]   = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('hfa_token') || '' : '';

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (action) params.set('action', action);
    try {
      const r = await fetch(`${API}/api/v1/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) setItems(d.data);
    } finally { setLoading(false); }
  }, [page, action, token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function exportCSV() {
    const cols = ['action','entity','user','email','ip','timestamp'];
    const rows = items.map(i => [
      i.action, i.entity,
      `${i.first_name || ''} ${i.last_name || ''}`.trim(),
      i.email || '', i.ip_address || '',
      new Date(i.created_at).toISOString(),
    ]);
    const csv = [cols, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `hopefusion-activity-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="admin-page-title">Activity Feed</h1>
          <span className="admin-page-sub">Platform-wide audit log</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select id="filter-action" className="filter-select" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="register">Register</option>
            <option value="user_suspended">User Suspended</option>
            <option value="user_activated">User Activated</option>
            <option value="user_deleted">User Deleted</option>
            <option value="payment_initialized">Payment</option>
            <option value="escrow_release">Escrow Release</option>
          </select>
          <button id="export-csv" className="export-btn" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Feed */}
      <div className="feed-wrap">
        {loading ? (
          <div className="feed-loading">Loading activity…</div>
        ) : items.length === 0 ? (
          <div className="feed-empty">No activity found for this filter</div>
        ) : items.map(item => (
          <div key={item.id} className="feed-item">
            <div className="feed-action-col">
              <span className="feed-badge" style={{ background: `${getActionColor(item.action)}1a`, color: getActionColor(item.action), borderColor: `${getActionColor(item.action)}33` }}>
                {item.action.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="feed-user-col">
              {item.first_name ? (
                <>
                  <span className="feed-user">{item.first_name} {item.last_name}</span>
                  <span className="feed-email">{item.email}</span>
                </>
              ) : <span className="feed-system">System</span>}
            </div>
            <div className="feed-entity-col">
              <span className="feed-entity">{item.entity}</span>
              {item.entity_id && <span className="feed-entity-id">{item.entity_id.slice(0,8)}…</span>}
            </div>
            <div className="feed-meta-col">
              {item.ip_address && <span className="feed-ip">🌐 {item.ip_address}</span>}
              <span className="feed-time">{new Date(item.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
        <span className="pg-info">Page {page}</span>
        <button className="pg-btn" disabled={items.length < 50} onClick={() => setPage(p => p+1)}>Next →</button>
      </div>

      <style>{`
        .admin-page { max-width: 1200px; }
        .admin-page-header { margin-bottom: 24px; }
        .admin-page-title  { font-size: 26px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
        .admin-page-sub    { font-size: 13px; color: #475569; }

        .filter-select {
          background: #0d1117; border: 1px solid rgba(255,255,255,0.1);
          color: #e2e8f0; border-radius: 10px; padding: 8px 12px;
          font-size: 13px; outline: none;
        }
        .export-btn {
          background: rgba(45,181,98,0.1); border: 1px solid rgba(45,181,98,0.3);
          color: #2db562; padding: 8px 14px; border-radius: 10px;
          font-size: 13px; cursor: pointer; font-weight: 500; white-space: nowrap;
        }
        .export-btn:hover { background: rgba(45,181,98,0.2); }

        .feed-wrap    { background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; margin-bottom: 20px; }
        .feed-loading, .feed-empty { color: #475569; text-align: center; padding: 48px; font-size: 14px; }

        .feed-item {
          display: grid;
          grid-template-columns: 200px 180px 150px 1fr;
          gap: 12px; align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
        }
        .feed-item:last-child { border-bottom: none; }
        .feed-item:hover      { background: rgba(255,255,255,0.02); }

        .feed-badge {
          display: inline-block; padding: 3px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 600; border: 1px solid; white-space: nowrap;
        }
        .feed-user    { display: block; font-size: 13px; font-weight: 600; color: #e2e8f0; }
        .feed-email   { display: block; font-size: 11px; color: #64748b; }
        .feed-system  { font-size: 12px; color: #475569; font-style: italic; }
        .feed-entity  { display: block; font-size: 12px; color: #94a3b8; font-weight: 500; }
        .feed-entity-id { display: block; font-size: 10px; color: #475569; font-family: monospace; }
        .feed-ip   { display: block; font-size: 11px; color: #475569; }
        .feed-time { display: block; font-size: 11px; color: #475569; }

        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; }
        .pg-btn  { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .pg-btn:hover:not(:disabled) { border-color: #2db562; color: #2db562; }
        .pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pg-info { color: #64748b; font-size: 13px; }

        @media (max-width: 768px) {
          .feed-item { grid-template-columns: 1fr 1fr; }
          .feed-meta-col { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}
