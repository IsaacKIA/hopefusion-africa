import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Mentor — Share Your Expertise with African Startups',
  description:
    "Join HopeFusion Africa as a mentor. Share your expertise with Ghana's and Africa's next generation of entrepreneurs. Manage sessions, track mentees, and make an impact.",
  keywords: [
    'become startup mentor Africa', 'mentor African startups', 'mentor Ghana entrepreneurs',
    'startup advisor Africa', 'mentorship program Ghana', 'African startup mentor',
  ],
  alternates: {
    canonical: '/mentor',
  },
  openGraph: {
    title: 'Become a Mentor — HopeFusion Africa',
    description:
      "Share your expertise with Africa's next generation of founders. Mentor startups across Ghana and the continent.",
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Become a Mentor — HopeFusion Africa',
    description: "Mentor African startups and make a lasting impact on Ghana's startup ecosystem.",
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
