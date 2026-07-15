import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Your Account — HopeFusion Africa',
  description: 'Enter your one-time verification code to activate your HopeFusion Africa account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
