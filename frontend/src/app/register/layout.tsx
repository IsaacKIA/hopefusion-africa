import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account — HopeFusion Africa',
  description: 'Join HopeFusion Africa. Register as a startup founder, investor, mentor, or corporate partner and become part of Africa\'s fastest-growing innovation ecosystem.',
  openGraph: {
    title: 'Create Account — HopeFusion Africa',
    description: 'Join Africa\'s leading startup ecosystem. Access funding, mentorship, grants, and a global network of innovators.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
