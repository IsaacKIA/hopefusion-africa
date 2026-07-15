import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eLearning — HopeFusion Africa',
  description: 'Upskill with curated courses, workshops, and resources designed for African founders, investors, and business leaders.',
  openGraph: {
    title: 'eLearning — HopeFusion Africa',
    description: 'Access Africa-focused business, tech, and leadership courses designed to scale your startup.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  keywords: ['African startup courses', 'entrepreneur training Africa', 'startup elearning', 'African business skills'],
  robots: {
    index: true,
    follow: true,
  },
};

export default function ElearningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
