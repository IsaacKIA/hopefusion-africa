import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Service Provider Portal — HopeFusion Africa',
  description: 'Offer your services to African startups through the HopeFusion Africa service provider marketplace.',
  robots: { index: false, follow: false },
};
export default function ServiceProviderLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
