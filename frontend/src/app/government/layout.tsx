import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Government Portal — HopeFusion Africa',
  description: 'Government analytics, SME data, and ecosystem oversight tools on HopeFusion Africa.',
  robots: { index: false, follow: false },
};
export default function GovernmentLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
