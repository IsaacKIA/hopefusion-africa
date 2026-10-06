import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Startup Matching — Find Investors & Mentors in Ghana & Africa',
  description:
    "HopeFusion Africa's AI-powered matching engine pairs your startup with the right investors, VCs, impact funds, and mentors across Ghana and Africa. Get matched in minutes.",
  keywords: [
    'startup matching Africa', 'AI investor matching Ghana', 'find investors Africa',
    'startup mentor matching', 'Ghana startup investors', 'African VC matching',
    'startup partner Africa', 'impact investor matching Africa',
  ],
  alternates: {
    canonical: '/matching',
  },
  openGraph: {
    title: 'AI Startup Matching — HopeFusion Africa',
    description:
      "Smart AI matching connects African startups with the right investors and mentors. Ghana's #1 startup matching platform.",
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Startup Matching — HopeFusion Africa',
    description: "Smart AI matching connects African startups with the right investors and mentors.",
    images: ['/images/hopefusion-og.png'],
  },
  // ⚠️  was incorrectly set to noindex — fixed
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
