'use client';

import { useState, useEffect, useCallback } from 'react';
import { API as apiClient } from '../../../lib/api';

const ROLE_COLORS: Record<string, string> = {
  startup: '#2db562', investor: '#3b82f6', mentor: '#f59e0b', admin: '#ef4444',
};

interface User {
  id: string; first_name: string; last_name: string; email: string;
  role: string; is_active: boolean; is_verified: boolean;
  country: string; created_at: string; last_login: string;
}

export default function AdminUsers() {
  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (search) params.set('search', search);
    if (role)   params.set('role', role);
    if (status) params.set('status', status);
    try {
      const d = await apiClient.get(`/admin/users?${params}`);
      if (d && d.success) { setUsers(d.data); setTotal(d.total); }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally { setLoading(false); }
  }, [page, search, role, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleStatus(id: string, currentActive: boolean) {
    setActionId(id);
    try {
      await apiClient.patch(`/admin/users/${id}/status`, { is_active: !currentActive });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
    setActionId('');
    fetchUsers();
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await apiClient.delete(`/admin/users/${id}`);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
    setActionId('');
    fetchUsers();
  }

  const pages = Math.ceil(total / 25);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">User Management</h1>
        <span className="admin-page-sub">{total.toLocaleString()} total users</span>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input id="user-search" className="filter-input" placeholder="🔍 Search name or email…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select id="filter-role" className="filter-select" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="startup">Startup</option>
          <option value="investor">Investor</option>
          <option value="mentor">Mentor</option>
          <option value="admin">Admin</option>
        </select>
        <select id="filter-status" className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th><th>Role</th><th>Status</th>
              <th>Country</th><th>Joined</th><th>Last Login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-loading">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={!u.is_active ? 'row-suspended' : ''}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar" style={{ background: `${ROLE_COLORS[u.role] || '#64748b'}33`, color: ROLE_COLORS[u.role] || '#64748b' }}>
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <p className="user-name">{u.first_name} {u.last_name}</p>
                      <p className="user-email">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td><span className="role-badge" style={{ background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role] }}>{u.role}</span></td>
                <td>
                  <span className={`status-badge ${u.is_active ? 'status-active' : 'status-suspended'}`}>
                    {u.is_active ? '● Active' : '○ Suspended'}
                  </span>
                </td>
                <td className="td-muted">{u.country || '—'}</td>
                <td className="td-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="td-muted">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                  <div className="action-btns">
                    <button id={`toggle-${u.id}`}
                      className={`btn-action ${u.is_active ? 'btn-suspend' : 'btn-activate'}`}
                      disabled={actionId === u.id}
                      onClick={() => toggleStatus(u.id, u.is_active)}>
                      {actionId === u.id ? '…' : u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                    <button id={`delete-${u.id}`} className="btn-action btn-delete"
                      disabled={actionId === u.id}
                      onClick={() => deleteUser(u.id, `${u.first_name} ${u.last_name}`)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
          <span className="pg-info">Page {page} of {pages}</span>
          <button className="pg-btn" disabled={page === pages} onClick={() => setPage(p => p+1)}>Next →</button>
        </div>
      )}

      <style>{`
        .admin-page { max-width: 1200px; }
        .admin-page-header { margin-bottom: 24px; }
        .admin-page-title  { font-size: 26px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
        .admin-page-sub    { font-size: 13px; color: #475569; }

        .filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .filter-input, .filter-select {
          background: #0d1117; border: 1px solid rgba(255,255,255,0.1);
          color: #e2e8f0; border-radius: 10px; padding: 10px 14px;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .filter-input { flex: 1; min-width: 200px; }
        .filter-input:focus, .filter-select:focus { border-color: #2db562; }

        .table-wrap { background: #0d1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: auto; }
        .users-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .users-table th { padding: 14px 16px; text-align: left; color: #475569; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .users-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        .users-table tr:last-child td { border-bottom: none; }
        .users-table tr:hover td { background: rgba(255,255,255,0.02); }
        .row-suspended td { opacity: 0.55; }
        .table-loading, .table-empty { text-align: center; color: #475569; padding: 40px !important; }

        .user-cell  { display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .user-name  { font-size: 13px; font-weight: 600; color: #e2e8f0; margin: 0; }
        .user-email { font-size: 11px; color: #64748b; margin: 0; }

        .role-badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .status-badge { font-size: 12px; font-weight: 500; }
        .status-active    { color: #2db562; }
        .status-suspended { color: #ef4444; }
        .td-muted { color: #64748b; }

        .action-btns { display: flex; gap: 6px; }
        .btn-action { padding: 5px 10px; border-radius: 7px; font-size: 11px; font-weight: 600; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-suspend  { background: rgba(239,68,68,0.1);  color: #ef4444; border-color: rgba(239,68,68,0.2); }
        .btn-activate { background: rgba(45,181,98,0.1);  color: #2db562; border-color: rgba(45,181,98,0.2); }
        .btn-delete   { background: rgba(100,116,139,0.1); color: #64748b; border-color: rgba(100,116,139,0.2); }
        .btn-suspend:hover  { background: rgba(239,68,68,0.2); }
        .btn-activate:hover { background: rgba(45,181,98,0.2); }
        .btn-delete:hover   { background: rgba(239,68,68,0.15); color: #ef4444; }

        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
        .pg-btn  { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .pg-btn:hover:not(:disabled) { border-color: #2db562; color: #2db562; }
        .pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pg-info { color: #64748b; font-size: 13px; }
      `}</style>
    </div>
  );
}
