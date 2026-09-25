import type { Metadata, Viewport } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/globals.css';
import '@/styles/print.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import PwaInstallBanner from '@/components/PwaInstallBanner';

export const viewport: Viewport = {
  themeColor: '#0d6efd',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Sistema de Gestión y Registro de Propinas',
  description: 'Sistema integral de prorrateo, disciplina, liquidación y fondo mancomunado de propinas',
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
    title: 'Propinas',
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Propinas" />
      </head>
      <body>
        <ServiceWorkerRegister />
        <PwaInstallBanner />
        {children}
      </body>
    </html>
  );
}
