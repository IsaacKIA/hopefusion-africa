import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

// Non-blocking font loading — Next.js handles preload & self-hosting
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HopeFusion Africa — Startup Ecosystem Platform',
  description: 'Connecting startups, investors, mentors, and resources across the African continent.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2DB562',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {/* Registers service worker on client mount */}
          <ServiceWorkerRegistrar />
          {/* Global custom PWA installation banner */}
          <PWAInstallPrompt />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
