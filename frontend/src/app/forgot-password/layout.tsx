import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password — HopeFusion Africa',
  description: 'Reset your HopeFusion Africa password. We\'ll send a verification code to your registered email address.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
