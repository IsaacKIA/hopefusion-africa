import React from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '../lib/deviceDetection';

interface BadgeProps {
  className?: string;
  style?: React.CSSProperties;
  target?: string;
}

/**
 * Official Apple App Store badge
 */
export function AppStoreBadge({ className, style, target = '_blank' }: BadgeProps) {
  return (
    <a
      href={APP_STORE_URL}
      target={target}
      rel="noopener noreferrer"
      className={`store-badge app-store-badge ${className || ''}`}
      style={style}
      aria-label="Download HopeFusion Africa on the Apple App Store"
    >
      <svg
        className="store-badge-icon"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.57.65-1.07 1.72-0.93 2.74 1 .08 2.03-.49 2.65-1.24z" />
      </svg>
      <div className="store-badge-text">
        <span className="store-badge-sub">Download on the</span>
        <span className="store-badge-title">App Store</span>
      </div>
    </a>
  );
}

/**
 * Official Google Play Store badge
 */
export function PlayStoreBadge({ className, style, target = '_blank' }: BadgeProps) {
  return (
    <a
      href={PLAY_STORE_URL}
      target={target}
      rel="noopener noreferrer"
      className={`store-badge play-store-badge ${className || ''}`}
      style={style}
      aria-label="Get HopeFusion Africa on Google Play"
    >
      <svg
        className="store-badge-icon"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M3.609 1.814L13.792 12 3.61 22.186c-.37-.309-.61-.777-.61-1.332V3.146c0-.555.24-1.023.609-1.332zm11.242 11.245l2.45 2.45-12.01 6.94 9.56-9.39zm0-2.118L5.29 1.55l12.01 6.94-2.45 2.451zm1.488 1.059l3.58 2.067c.72.417.72 1.099 0 1.516l-3.58 2.068-2.115-2.115 2.115-2.136z" />
      </svg>
      <div className="store-badge-text">
        <span className="store-badge-sub">GET IT ON</span>
        <span className="store-badge-title">Google Play</span>
      </div>
    </a>
  );
}
