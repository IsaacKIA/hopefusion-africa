import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join HopeFusion Africa — Register as Startup, Investor or Mentor',
  description:
    "Create your free account on HopeFusion Africa. Join 5,000+ founders, investors, and mentors across Ghana and Africa. Access grants, AI matching, and a continent-wide startup network.",
  keywords: [
    'join startup platform Africa', 'register startup Ghana', 'create startup account Africa',
    'startup investor register Ghana', 'African startup network join', 'HopeFusion register',
  ],
  alternates: {
    canonical: '/register',
  },
  openGraph: {
    title: 'Join HopeFusion Africa — Create Your Free Account',
    description:
      "Join Africa's leading startup ecosystem. Access funding, mentorship, grants, and a global network of innovators. Free to join.",
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join HopeFusion Africa — Free Account',
    description: "Join Africa's #1 startup platform. Free for founders, investors & mentors.",
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
