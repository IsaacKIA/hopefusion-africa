import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Startup Grants & Funding — Africa & Ghana Funding Opportunities',
  description:
    'Discover the best startup grants, equity-free capital, seed funding, and government-backed finance for African founders. Updated daily. Apply through HopeFusion Africa.',
  keywords: [
    'startup grants Africa', 'African startup funding', 'equity-free funding Ghana',
    'seed capital Africa', 'government grants startups Ghana', 'African development grants',
    'impact grants Africa', 'SME funding Ghana', 'women startup grants Africa',
    'youth entrepreneur grants Ghana',
  ],
  alternates: {
    canonical: '/grants',
  },
  openGraph: {
    title: 'Startup Grants & Funding — HopeFusion Africa',
    description:
      'Find and apply for startup grants, seed funding, and equity-free capital across Ghana and Africa. Updated daily.',
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Startup Grants & Funding — HopeFusion Africa',
    description: 'Find and apply for startup grants and seed funding across Ghana and Africa.',
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function GrantsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
