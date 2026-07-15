'use client';

import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'list' | 'stats' | 'profile' | 'text';
  count?: number;
}

export default function Skeleton({ type = 'card', count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  const renderSkeleton = () => {
    switch (type) {
      case 'stats':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%' }}>
            {items.map((_, i) => (
              <div key={i} className="glass-panel shimmer-box" style={{ padding: '24px', height: '100px' }} />
            ))}
          </div>
        );
      case 'list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {items.map((_, i) => (
              <div key={i} className="glass-panel shimmer-box" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }} />
            ))}
          </div>
        );
      case 'profile':
        return (
          <div className="glass-panel shimmer-box" style={{ padding: '32px', width: '100%', height: '350px' }} />
        );
      case 'text':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {items.map((_, i) => (
              <div key={i} className="shimmer-line" style={{ height: '16px', borderRadius: '4px', width: i % 2 === 0 ? '100%' : '75%' }} />
            ))}
          </div>
        );
      case 'card':
      default:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
            {items.map((_, i) => (
              <div key={i} className="glass-panel shimmer-box" style={{ padding: '32px', height: '180px' }} />
            ))}
          </div>
        );
    }
  };

  return (
    <>
      {renderSkeleton()}
      
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-color: rgba(255, 255, 255, 0.01);
          }
          50% {
            background-color: rgba(255, 255, 255, 0.05);
          }
          100% {
            background-color: rgba(255, 255, 255, 0.01);
          }
        }
        .shimmer-box {
          animation: shimmer 1.5s infinite ease-in-out !important;
          border-color: rgba(255, 255, 255, 0.04) !important;
        }
        .shimmer-line {
          animation: shimmer 1.5s infinite ease-in-out;
          background-color: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </>
  );
}
