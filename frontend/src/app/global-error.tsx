'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error('[HopeFusion] Unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.06) 0%, transparent 50%)',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⚡</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ef4444', marginBottom: '12px' }}>
              Something went wrong
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: '16px' }}>
              Unexpected Error
            </h1>
            <p style={{ color: '#a0a0a0', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '32px' }}>
              We encountered an unexpected error. Our team has been notified.
              Please try again — if the issue persists, contact{' '}
              <a href="mailto:support@hopefusionafrica.com" style={{ color: '#2db562', textDecoration: 'none' }}>
                support@hopefusionafrica.com
              </a>.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  backgroundColor: '#2db562', color: '#05140b', fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600, padding: '10px 24px', borderRadius: '12px',
                  cursor: 'pointer', fontSize: '0.9rem', border: 'none',
                }}
              >
                Try Again
              </button>
              <a href="/" style={{
                backgroundColor: 'transparent', color: '#fff', fontFamily: 'Outfit, sans-serif',
                fontWeight: 600, padding: '10px 24px', borderRadius: '12px',
                cursor: 'pointer', fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}>
                ← Home
              </a>
            </div>
            {error?.digest && (
              <p style={{ fontSize: '0.7rem', color: '#6b6b6b', marginTop: '24px', fontFamily: 'monospace' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
