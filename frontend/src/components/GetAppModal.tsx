'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { AppStoreBadge, PlayStoreBadge } from './StoreBadges';

interface GetAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetAppModal({ isOpen, onClose }: GetAppModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="get-app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="get-app-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <button
          className="get-app-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="get-app-modal-header">
          <Image
            src="/images/hopefusion-logo.png"
            alt="HopeFusion Africa"
            width={160}
            height={42}
            style={{ height: '36px', width: 'auto', marginBottom: '12px' }}
          />
          <h3 className="get-app-modal-title">Get HopeFusion on your Phone</h3>
          <p className="get-app-modal-subtitle">
            Experience Africa’s premier startup ecosystem anywhere. Direct from the official stores.
          </p>
        </div>

        <div className="get-app-modal-body">
          {/* QR Code Section */}
          <div className="get-app-qr-box">
            <div className="get-app-qr-frame">
              {/* QR pointing to /download which auto-detects iOS or Android */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fhopefusion.africa%2Fdownload&margin=4"
                alt="QR code to download HopeFusion mobile app"
                width={160}
                height={160}
                className="get-app-qr-img"
              />
            </div>
            <p className="get-app-qr-hint">
              Scan with your camera to open directly on your mobile device
            </p>
          </div>

          {/* Direct Store Links */}
          <div className="get-app-stores-box">
            <div className="get-app-badges">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>

            <div className="get-app-features-list">
              <div className="get-app-feature-item">
                <span className="get-app-check">✓</span>
                <span>Push notifications for instant investor & mentor matches</span>
              </div>
              <div className="get-app-feature-item">
                <span className="get-app-check">✓</span>
                <span>Direct HD video calls & mentorship sessions</span>
              </div>
              <div className="get-app-feature-item">
                <span className="get-app-check">✓</span>
                <span>Fast biometric sign-in & offline pitch deck caching</span>
              </div>
            </div>
          </div>
        </div>

        <div className="get-app-modal-footer">
          <span>Official native build • Verified by Apple App Store & Google Play</span>
        </div>
      </div>
    </div>
  );
}
