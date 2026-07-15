import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentorship — HopeFusion Africa',
  description: 'Connect with experienced mentors across Africa and globally. Get guidance on product, fundraising, operations, and scaling your startup.',
  openGraph: {
    title: 'Mentorship — HopeFusion Africa',
    description: 'Get matched with the right mentor to grow your African startup. Expert guidance on fundraising, product, and scaling.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  keywords: ['startup mentorship Africa', 'African business mentor', 'mentor matching Africa', 'startup advisor Africa'],
  robots: {
    index: true,
    follow: true,
  },
};

export default function MentorshipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
