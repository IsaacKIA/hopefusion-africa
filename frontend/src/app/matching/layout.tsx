import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'AI Startup Matching — HopeFusion Africa',
  description: 'Get intelligently matched with investors, mentors, and strategic partners using HopeFusion Africa\'s AI-powered matching engine.',
  keywords: ['startup matching Africa', 'AI investor matching', 'find investors Africa', 'startup mentor matching'],
  openGraph: { title: 'AI Startup Matching — HopeFusion Africa', description: 'Smart matching connecting African startups with the right investors and mentors.', type: 'website', siteName: 'HopeFusion Africa' },
  robots: { index: false, follow: false },
};
export default function MatchingLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
