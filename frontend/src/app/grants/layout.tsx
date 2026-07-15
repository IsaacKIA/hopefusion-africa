import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grants & Funding Opportunities — HopeFusion Africa',
  description: 'Discover African startup grants, seed funding, equity-free capital, and government-backed financing opportunities. Updated regularly by HopeFusion Africa.',
  openGraph: {
    title: 'Grants & Funding Opportunities — HopeFusion Africa',
    description: 'Find grants, seed funding, and equity-free capital for your African startup. Access curated funding opportunities from across the continent.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  keywords: ['startup grants Africa', 'African startup funding', 'equity-free funding', 'seed capital Africa', 'government grants startups'],
  robots: {
    index: true,
    follow: true,
  },
};

export default function GrantsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
