import type { Metadata, Viewport } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/globals.css';
import '@/styles/print.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import PwaInstallBanner from '@/components/PwaInstallBanner';

export const viewport: Viewport = {
  themeColor: '#c92a2a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Shimaya 嶋屋 — Gestión & Liquidación de Propinas',
  description: 'Sistema integral de prorrateo, fondo mancomunado, disciplina y gestión multi-sede Takumi Edition',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shimaya Propinas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shimaya Propinas" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <PwaInstallBanner />
        {children}
      </body>
    </html>
  );
}
