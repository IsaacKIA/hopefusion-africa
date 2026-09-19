import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Dashboard — HopeFusion Africa',
  description: 'Your HopeFusion Africa dashboard. Manage your startup profile, track activity, and access all platform features.',
  robots: { index: false, follow: false },
};
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
