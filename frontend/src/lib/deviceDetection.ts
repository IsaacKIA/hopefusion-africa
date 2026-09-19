/**
 * Device platform detection & app store routing utilities
 * Ensures safe, standard mobile app distribution to official stores (Apple App Store / Google Play Store)
 * rather than risky, unsolicited direct installation popups.
 */

export type DevicePlatform = 'ios' | 'android' | 'desktop';

export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ||
  'https://apps.apple.com/app/hopefusion-africa/id6740000000';

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.hopefusionafrica.app';

/**
 * Accurately detects whether current client is iOS, Android, or Desktop
 */
export function getDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent || window.navigator.vendor || '';

  // Detect iOS: iPhone, iPod, iPad (including iPadOS with Safari desktop UA)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  if (isIOS) return 'ios';

  // Detect Android
  if (/android/i.test(ua)) return 'android';

  return 'desktop';
}

/**
 * Checks if the platform is running as an installed standalone PWA/app
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Directs user to the appropriate official store for their device
 */
export function redirectToAppStore(platform?: DevicePlatform): void {
  const target = platform || getDevicePlatform();
  if (target === 'ios') {
    window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer');
  } else if (target === 'android') {
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
  } else {
    // On desktop, navigate to dedicated download page with QR code & both stores
    window.location.href = '/download';
  }
}
