'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  getDevicePlatform,
  isStandaloneMode,
  APP_STORE_URL,
  PLAY_STORE_URL,
  DevicePlatform,
} from '../lib/deviceDetection';
import GetAppModal from './GetAppModal';

const DISMISSAL_KEY = 'hf_smart_banner_dismissed';
const DISMISSAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export default function SmartAppBanner() {
  const [platform, setPlatform] = useState<DevicePlatform>('desktop');
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const detected = getDevicePlatform();
    setPlatform(detected);

    // Global listener so any component (navbar, footer, hero) can trigger the official app modal
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-get-app-modal', handleOpenModal);

    // If running in standalone mode (already installed / opened as native app), do not show banner
    if (isStandaloneMode()) {
      return () => window.removeEventListener('open-get-app-modal', handleOpenModal);
    }

    // Only mobile devices (iOS / Android) show the sleek smart banner
    // Desktop users are never interrupted by popups
    if (detected === 'ios' || detected === 'android') {
      const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < DISMISSAL_DURATION_MS) {
          return () => window.removeEventListener('open-get-app-modal', handleOpenModal);
        }
      }

      // Respectful delay so page content renders smoothly before banner slides in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2200);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('open-get-app-modal', handleOpenModal);
      };
    }

    return () => window.removeEventListener('open-get-app-modal', handleOpenModal);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    } catch {
      // safe fallback if storage unavailable
    }
  };

  const handleStoreRedirect = () => {
    if (platform === 'ios') {
      window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer');
    } else if (platform === 'android') {
      window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
    } else {
      setIsModalOpen(true);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Desktop & universal modal when user requests official app details */}
      <GetAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Mobile-only Smart App Banner (directed to Apple App Store or Google Play) */}
      {isVisible && (
        <div
          className={`smart-app-banner smart-banner-${platform} fade-in`}
          role="region"
          aria-label="HopeFusion mobile app banner"
        >
          <button
            className="smart-banner-close"
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
          >
            ×
          </button>

          <div className="smart-banner-icon">
            <Image
              src="/icons/icon-96x96.png"
              alt="HopeFusion Africa App"
              width={44}
              height={44}
              style={{ borderRadius: '10px' }}
            />
          </div>

          <div className="smart-banner-meta">
            <div className="smart-banner-title-row">
              <span className="smart-banner-name">HopeFusion Africa</span>
            </div>
            <div className="smart-banner-sub">
              {platform === 'ios' ? 'HopeFusion HQ • On App Store' : 'HopeFusion HQ • On Google Play'}
            </div>
            <div className="smart-banner-rating">
              <span className="smart-banner-stars">★★★★★</span>
              <span className="smart-banner-score">4.9</span>
            </div>
          </div>

          <button
            className={`smart-banner-cta-btn ${
              platform === 'ios' ? 'smart-btn-apple' : 'smart-btn-google'
            }`}
            onClick={handleStoreRedirect}
          >
            {platform === 'ios' ? 'GET' : 'INSTALL'}
          </button>
        </div>
      )}
    </>
  );
}
