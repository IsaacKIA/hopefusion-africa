import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Startup Mentorship — Find a Business Mentor in Ghana & Africa',
  description:
    'Connect with experienced startup mentors across Ghana and Africa. Get expert guidance on fundraising, product development, scaling, and operations through HopeFusion Africa.',
  keywords: [
    'startup mentorship Africa', 'African business mentor', 'mentor matching Ghana',
    'startup advisor Africa', 'business mentorship Ghana', 'find mentor startup Africa',
    'African entrepreneur mentor', 'startup coaching Ghana',
  ],
  alternates: {
    canonical: '/mentorship',
  },
  openGraph: {
    title: 'Startup Mentorship — HopeFusion Africa',
    description:
      "Get matched with the right mentor to grow your African startup. Expert guidance on fundraising, product, and scaling from Ghana's top startup mentors.",
    type: 'website',
    siteName: 'HopeFusion Africa',
    images: [{ url: '/images/hopefusion-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Startup Mentorship — HopeFusion Africa',
    description: "Find the right mentor for your African startup. Ghana's best mentorship platform.",
    images: ['/images/hopefusion-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function MentorshipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
