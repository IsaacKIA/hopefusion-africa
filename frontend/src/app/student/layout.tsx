import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Student Dashboard — HopeFusion Africa',
  description: 'Access your learning progress, mentorship sessions, and curriculum modules on HopeFusion Africa.',
  robots: { index: false, follow: false },
};
export default function StudentLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
