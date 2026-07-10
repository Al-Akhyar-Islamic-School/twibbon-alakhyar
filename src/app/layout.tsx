import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'Pilih twibbon aktif Yayasan Al Akhyar, pasang fotomu, lalu unduh — semua di browser, tanpa aplikasi editor.',
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: 'Buat twibbon eventmu sendiri dalam hitungan detik.',
    locale: 'id_ID',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#006195',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ServiceWorkerRegister />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
