import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
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
