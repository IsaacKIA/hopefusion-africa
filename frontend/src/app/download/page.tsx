'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getDevicePlatform,
  APP_STORE_URL,
  PLAY_STORE_URL,
  DevicePlatform,
} from '../../lib/deviceDetection';
import { AppStoreBadge, PlayStoreBadge } from '../../components/StoreBadges';

export default function DownloadPage() {
  const [platform, setPlatform] = useState<DevicePlatform>('desktop');
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    const detected = getDevicePlatform();
    setPlatform(detected);

    // If on a mobile device, automatically redirect to the respective official app store
    if (detected === 'ios') {
      setRedirectCountdown(2);
      const timer = setTimeout(() => {
        window.location.href = APP_STORE_URL;
      }, 1800);
      return () => clearTimeout(timer);
    } else if (detected === 'android') {
      setRedirectCountdown(2);
      const timer = setTimeout(() => {
        window.location.href = PLAY_STORE_URL;
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Top minimal header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/images/hopefusion-logo.png"
            alt="HopeFusion Africa"
            width={160}
            height={42}
            style={{ height: '38px', width: 'auto' }}
            priority
          />
        </Link>
        <Link
          href="/"
          className="btn-secondary"
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          ← Back to Web Platform
        </Link>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Mobile redirect notification banner if auto-redirecting */}
        {redirectCountdown !== null && (
          <div
            style={{
              marginBottom: '32px',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(45, 181, 98, 0.3)',
              backgroundColor: 'rgba(45, 181, 98, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.4rem' }}>📱</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {platform === 'ios'
                    ? 'Redirecting to Apple App Store...'
                    : 'Redirecting to Google Play Store...'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Opening verified store application for your device.
                </div>
              </div>
            </div>
            <a
              href={platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL}
              style={{
                background: 'var(--brand-green)',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Open Now →
            </a>
          </div>
        )}

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid rgba(45,181,98,0.25)',
              background: 'rgba(45,181,98,0.06)',
              color: 'var(--brand-green)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <span>Official Mobile Experience</span>
          </div>

          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '18px',
            }}
          >
            HopeFusion Africa <span style={{ color: 'var(--brand-green)' }}>in your pocket</span>
          </h1>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              maxWidth: '640px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Connect with founders, investors, and mentors across Africa on the go. Verified on the
            official Apple App Store and Google Play Store.
          </p>

          {/* Badges row */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '48px',
            }}
          >
            <AppStoreBadge />
            <PlayStoreBadge />
          </div>
        </div>

        {/* Two-column feature + QR card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          {/* QR Code Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '40px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                marginBottom: '20px',
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https%3A%2F%2Fhopefusion.africa%2Fdownload&margin=4"
                alt="QR Code to install HopeFusion Africa"
                width={180}
                height={180}
                style={{ display: 'block' }}
              />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
              Scan from Your Phone
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '280px', margin: '0 auto', lineHeight: 1.5 }}>
              Use your phone’s camera to scan and automatically open the right store for your device.
            </p>
          </div>

          {/* Features Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
              Why use the native app?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(45,181,98,0.12)',
                    color: 'var(--brand-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
                    Instant Push Notifications
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Never miss deal inquiries, grant submission updates, or mentor session reminders.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(45,181,98,0.12)',
                    color: 'var(--brand-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  📹
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
                    Integrated WebRTC Video Calls
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Join 1-on-1 mentor and investor pitches with crystal-clear audio and video on low bandwidth.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(45,181,98,0.12)',
                    color: 'var(--brand-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  🔒
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
                    Biometric & Offline Pitch Decks
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Face ID and Fingerprint login with offline caching for elevator pitches in any location.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
