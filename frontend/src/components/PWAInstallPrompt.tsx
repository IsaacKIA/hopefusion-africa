'use client';

import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser-driven mini-infobar prompt
      e.preventDefault();
      // Cache the install prompt event
      setDeferredPrompt(e);
      // Toggle banner display visibility
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Don't show if already running in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show native browser install prompt dialog
    deferredPrompt.prompt();

    // Check user interaction outcome
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);

    // Clean up cached event handler
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-bg-blur"></div>
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          <img src="/icons/icon-72x72.png" alt="HopeFusion PWA Icon" />
        </div>
        <div className="pwa-install-info">
          <h4 className="pwa-install-title">Install HopeFusion Africa</h4>
          <p className="pwa-install-desc">Add this app to your home screen for rapid offline launches and full screen views.</p>
        </div>
        <div className="pwa-install-actions">
          <button className="pwa-btn-dismiss" onClick={handleDismiss}>
            Later
          </button>
          <button className="pwa-btn-accept" onClick={handleInstall}>
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
