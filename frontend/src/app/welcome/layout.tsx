import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Welcome to HopeFusion Africa',
  description: 'You\'re in! Complete your onboarding to unlock all features of HopeFusion Africa\'s startup ecosystem.',
  robots: { index: false, follow: false },
};
export default function WelcomeLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
