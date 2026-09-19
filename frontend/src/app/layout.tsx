import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import SmartAppBanner from '@/components/SmartAppBanner';
import { SpeedInsights } from '@vercel/speed-insights/next';

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
  title: {
    default: 'HopeFusion Africa — Startup Ecosystem Platform',
    template: '%s | HopeFusion Africa',
  },
  description: 'Connecting African startups, investors, mentors, and resources. Access grants, mentorship, marketplace, and smart matching across the continent.',
  keywords: [
    'African startups', 'startup funding Africa', 'African investors', 'startup mentorship Africa',
    'African innovation', 'tech startups Africa', 'HopeFusion', 'startup ecosystem Africa',
    'African grants', 'African marketplace',
  ],
  authors: [{ name: 'HopeFusion Africa', url: 'https://hopefusionafrica.com' }],
  creator: 'HopeFusion Africa',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://hopefusionafrica.com'),
  openGraph: {
    type: 'website',
    siteName: 'HopeFusion Africa',
    title: 'HopeFusion Africa — Startup Ecosystem Platform',
    description: 'Africa\'s leading platform connecting startups, investors, mentors, and opportunities.',
    url: 'https://hopefusionafrica.com',
    locale: 'en_US',
    images: [{
      url: '/images/hopefusion-og.png',
      width: 1200,
      height: 630,
      alt: 'HopeFusion Africa — Where African Innovation Meets Opportunity',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HopeFusion Africa — Startup Ecosystem Platform',
    description: 'Africa\'s leading platform connecting startups, investors, mentors, and opportunities.',
    creator: '@HopeFusionHQ',
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
          {/* Smart App Banner — directs mobile users safely to App Store / Google Play */}
          <SmartAppBanner />
          {children}
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
