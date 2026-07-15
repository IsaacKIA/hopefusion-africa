import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace — HopeFusion Africa',
  description: 'Browse the HopeFusion Africa marketplace for startup products, services, tools, and solutions built by African innovators.',
  openGraph: {
    title: 'Marketplace — HopeFusion Africa',
    description: 'Discover and trade products, services, and solutions built by Africa\'s top startups.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  keywords: ['African startup marketplace', 'startup products Africa', 'African tech marketplace', 'African innovation hub'],
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
