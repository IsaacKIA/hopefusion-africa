export default function DashboardLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading…</p>
    </div>
  );
}
