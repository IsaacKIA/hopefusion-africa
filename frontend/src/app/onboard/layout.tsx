import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Complete Your Profile — HopeFusion Africa',
  description: 'Set up your HopeFusion Africa profile to get matched with investors, mentors, and opportunities.',
  robots: { index: false, follow: false },
};
export default function OnboardLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
