'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(45, 181, 98, 0.06) 0%, transparent 50%)',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '5rem', marginBottom: '16px', lineHeight: 1 }}>🌍</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--brand-green)', marginBottom: '12px' }}>
          404 — Page Not Found
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '16px', lineHeight: 1.2 }}>
          This page doesn't exist yet
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px' }}>
          The page you're looking for may have moved, been renamed, or doesn't exist.
          You can return to the homepage or go to your dashboard.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
          <Link href="/dashboard" className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
            Go to Dashboard
          </Link>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '48px' }}>
          HopeFusion Africa · Africa's Entrepreneurship Operating System
        </p>
      </div>
    </div>
  );
}
