import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Startup Marketplace — Buy & Sell African Tech Products & Services',
  description:
    'Explore the HopeFusion Africa marketplace — buy and sell startup products, SaaS tools, services, and digital solutions built by African innovators. Ghana\'s best startup marketplace.',
  keywords: [
    'African startup marketplace', 'startup products Africa', 'African tech marketplace',
    'Ghana digital marketplace', 'African SaaS products', 'startup services Africa',
    'B2B marketplace Africa', 'African innovation hub', 'buy African tech',
  ],
  alternates: {
    canonical: '/marketplace',
  },
  openGraph: {
    title: 'Startup Marketplace — HopeFusion Africa',
    description: "Discover and trade products, services, and solutions built by Africa's top startups.",
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Startup Marketplace — HopeFusion Africa',
    description: "Africa's #1 startup product and services marketplace.",
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
