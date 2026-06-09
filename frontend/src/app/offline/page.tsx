'use client';

import React from 'react';

export default function OfflinePage() {
  const handleReconnect = () => {
    // Attempt to reload the page to check if online again
    window.location.reload();
  };

  return (
    <div className="offline-container">
      <div className="offline-bg-glow"></div>
      <div className="offline-card">
        <div className="offline-icon-wrapper">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="offline-svg-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.284 16.284A3 3 0 0 0 12 17h.008a3 3 0 0 0 3.712-3.712M19.5 10.5c0-7.142-7.5-9-7.5-9s-7.5 1.858-7.5 9c0 3.6 2 5.5 2 5.5L8.5 21h7l2-5s2-1.9 2-5.5Zm-7.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
            />
          </svg>
        </div>
        <h1 className="offline-title">Connection Lost</h1>
        <p className="offline-description">
          HopeFusion Africa could not reach the server. Please check your internet connection and try again.
        </p>
        <button className="offline-btn" onClick={handleReconnect}>
          Try Reconnecting
        </button>
      </div>
    </div>
  );
}
