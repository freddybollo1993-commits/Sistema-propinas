import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/globals.css';
import '@/styles/print.css';

export const metadata: Metadata = {
  title: 'Sistema de Gestión y Registro de Propinas',
  description: 'Sistema integral de prorrateo, disciplina, liquidación y fondo mancomunado de propinas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
