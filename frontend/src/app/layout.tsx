import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import SmartAppBanner from '@/components/SmartAppBanner';
import { SpeedInsights } from '@vercel/speed-insights/next';

// ─── Fonts — non-blocking, self-hosted by Next.js CDN ──────────────────────
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
  preload: true,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hopefusionafrica.com';

// ─── Global Metadata ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: 'HopeFusion Africa — Startup Ecosystem Platform',
    template: '%s | HopeFusion Africa',
  },

  description:
    'HopeFusion Africa is the #1 AI-powered startup ecosystem in Ghana and across Africa. Connect with investors, access grants, find mentors, and scale your business continent-wide.',

  keywords: [
    // Ghana-specific
    'startup Ghana', 'startup funding Ghana', 'Ghana investors', 'Ghana startup ecosystem',
    'Ghana grants', 'tech startups Accra', 'business funding Ghana', 'Ghana entrepreneur',
    'startup accelerator Ghana', 'Ghana innovation hub',
    // Pan-Africa
    'African startups', 'startup funding Africa', 'African investors', 'startup mentorship Africa',
    'African innovation', 'tech startups Africa', 'HopeFusion Africa', 'startup ecosystem Africa',
    'African grants', 'African marketplace', 'Africa venture capital', 'impact investing Africa',
    'startup community Africa', 'African entrepreneurship', 'Africa business platform',
    // Feature keywords
    'AI startup matching', 'startup grants platform', 'mentor matching Africa',
    'e-learning startups Africa', 'startup marketplace Africa',
  ],

  authors: [{ name: 'HopeFusion Africa', url: 'https://hopefusionafrica.com' }],
  creator: 'HopeFusion Africa',
  publisher: 'HopeFusion Africa',
  category: 'Technology',

  // ─── Canonical & Alternates ─────────────────────────────────────────────
  alternates: {
    canonical: '/',
    languages: {
      'en-GH': '/',
      'en-NG': '/',
      'en-ZA': '/',
      'en-KE': '/',
      'fr-SN': '/',
      'x-default': '/',
    },
  },

  // ─── Open Graph ─────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    siteName: 'HopeFusion Africa',
    title: 'HopeFusion Africa — #1 AI-Powered Startup Platform in Ghana & Africa',
    description:
      "Africa's leading platform connecting startups with investors, grants, mentors, and opportunities. Join 5,000+ innovators from Ghana to South Africa.",
    url: 'https://hopefusionafrica.com',
    locale: 'en_GH',
    images: [
      {
        url: '/images/hopefusion-og.png',
        width: 1200,
        height: 630,
        alt: 'HopeFusion Africa — Where African Innovation Meets Opportunity',
        type: 'image/png',
      },
    ],
  },

  // ─── Twitter / X Card ───────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'HopeFusion Africa — Startup Ecosystem Platform',
    description:
      "Africa's leading platform connecting startups, investors, mentors, and opportunities.",
    creator: '@HopeFusionHQ',
    site: '@HopeFusionHQ',
    images: ['/images/hopefusion-og.png'],
  },

  // ─── Crawler directives ─────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  // ─── App / PWA links ────────────────────────────────────────────────────
  appLinks: {
    ios: {
      url: 'https://apps.apple.com/app/hopefusion-africa',
      app_store_id: 'hopefusion-africa',
    },
    android: {
      package: 'com.hopefusionafrica.app',
      app_name: 'HopeFusion Africa',
    },
  },

  // ─── Verification tokens (Google Search Console) ─────────────────────────
  verification: {
    google: [
      '5PBXzgOEOvnMOV46EkT72FQDYOr1pVImMn7524W74U8',
      ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? [process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION] : []),
      'google59e336434f702a44',
    ],
    // yandex: '',
    // bing: '',
  },

  // ─── Misc ───────────────────────────────────────────────────────────────
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

// ─── Viewport ───────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#2DB562' },
  ],
  colorScheme: 'dark',
};

// ─── JSON-LD Structured Data ────────────────────────────────────────────────
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'HopeFusion Africa',
  url: 'https://hopefusionafrica.com',
  logo: 'https://hopefusionafrica.com/images/hopefusion-og.png',
  sameAs: [
    'https://twitter.com/HopeFusionHQ',
    'https://www.linkedin.com/company/hopefusion-africa',
    'https://www.facebook.com/HopeFusionAfrica',
    'https://www.instagram.com/hopefusionafrica',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: ['English', 'French', 'Twi', 'Hausa', 'Swahili'],
    areaServed: ['GH', 'NG', 'KE', 'ZA', 'SN', 'GN', 'CI', 'TZ', 'UG', 'ET'],
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GH',
    addressLocality: 'Accra',
  },
  foundingDate: '2024',
  description:
    "HopeFusion Africa is Ghana's and Africa's leading AI-powered startup ecosystem platform — connecting founders, investors, mentors, and grants.",
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'HopeFusion Africa',
  url: 'https://hopefusionafrica.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://hopefusionafrica.com/matching?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-GH',
  publisher: {
    '@type': 'Organization',
    name: 'HopeFusion Africa',
    logo: {
      '@type': 'ImageObject',
      url: 'https://hopefusionafrica.com/images/hopefusion-og.png',
    },
  },
};

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable}`}
    >
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Geo-targeting signals for Ghana / Africa */}
        <meta name="geo.region" content="GH" />
        <meta name="geo.placename" content="Accra, Ghana" />
        <meta name="geo.position" content="5.6037;-0.1870" />
        <meta name="ICBM" content="5.6037, -0.1870" />
        <meta name="language" content="English" />
        <meta name="content-language" content="en-gh" />

        {/* Mobile / app meta */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HopeFusion" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* DNS prefetch & preconnect for speed ──────────────────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://hopefusion-africa.onrender.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />

        {/* JSON-LD — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* JSON-LD — WebSite (enables Google Sitelinks Search Box) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>

      <body suppressHydrationWarning>
        <AuthProvider>
          {/* Registers service worker on client mount */}
          <ServiceWorkerRegistrar />
          {/* Smart App Banner — directs mobile users to App Store / Google Play */}
          <SmartAppBanner />
          {children}
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
