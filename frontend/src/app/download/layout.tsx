import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Download HopeFusion Africa App — iOS & Android',
  description: 'Download the HopeFusion Africa mobile app on iOS and Android. Manage your startup ecosystem on the go.',
  keywords: ['HopeFusion Africa app', 'African startup app', 'download startup app Africa'],
  openGraph: { title: 'Download HopeFusion Africa App', description: 'Available on the App Store and Google Play.', type: 'website', siteName: 'HopeFusion Africa' },
  robots: { index: true, follow: true },
};
export default function DownloadLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
