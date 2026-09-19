'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '40px',
            textAlign: 'center',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', marginBottom: '8px' }}>
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              {this.props.fallbackDescription || 'An unexpected rendering error occurred in this workspace view. You can reload this component or return to the main dashboard.'}
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#f87171',
                overflowX: 'auto',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={this.handleRetry}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.85rem' }}
              >
                🔄 Try Again
              </button>
              <Link
                href="/dashboard"
                className="btn-secondary"
                style={{ padding: '10px 24px', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
