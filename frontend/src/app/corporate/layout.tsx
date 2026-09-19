import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Corporate Portal — HopeFusion Africa',
  description: 'Corporate CSR, investment tracking, and startup partnership tools on HopeFusion Africa.',
  robots: { index: false, follow: false },
};
export default function CorporateLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
