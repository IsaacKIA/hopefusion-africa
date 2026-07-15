import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — HopeFusion Africa',
  description: 'Sign in to your HopeFusion Africa account to access your startup dashboard, investor hub, or mentor panel.',
  openGraph: {
    title: 'Sign In — HopeFusion Africa',
    description: 'Access Africa\'s leading startup ecosystem platform. Connect with investors, mentors, and opportunities.',
    type: 'website',
    siteName: 'HopeFusion Africa',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
