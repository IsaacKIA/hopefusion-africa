import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eLearning for Startups — Business & Tech Courses in Ghana & Africa',
  description:
    'Upskill with Africa-focused online courses, workshops, and resources for founders, investors, and business leaders. Grow your startup with HopeFusion Africa eLearning.',
  keywords: [
    'African startup courses', 'entrepreneur training Ghana', 'startup elearning Africa',
    'African business skills', 'online business courses Ghana', 'startup training Africa',
    'tech courses Africa', 'African founder education', 'SME training Ghana',
  ],
  alternates: {
    canonical: '/elearning',
  },
  openGraph: {
    title: 'eLearning for African Startups — HopeFusion Africa',
    description:
      'Access Africa-focused business, tech, and leadership courses designed to scale your startup from Ghana to the continent.',
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eLearning for African Startups — HopeFusion Africa',
    description: "Africa's best online startup courses and training.",
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function ElearningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
