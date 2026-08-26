import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PalletFlow Lab · Control de almacén',
  description: 'PWA local de pruebas para gestionar recepciones, palés y ubicaciones.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'PalletFlow Lab',
    description: 'Control de almacén · Entorno de pruebas',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'PalletFlow Lab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PalletFlow Lab',
    description: 'Control de almacén · Entorno de pruebas',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#131a20' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
