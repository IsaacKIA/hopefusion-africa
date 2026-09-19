'use client';

/**
 * Re-exports SmartAppBanner for backwards compatibility.
 * Replaces the previous risky, unsolicited direct PWA popup dialog with
 * professional store direction (Apple App Store / Google Play Store).
 */
import SmartAppBanner from './SmartAppBanner';

export default function PWAInstallPrompt() {
  return <SmartAppBanner />;
}
