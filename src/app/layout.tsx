import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow-cond',
});

export const metadata: Metadata = {
  title: 'MEM AUTOMOTIVE — Ordinateur de Bord',
  description: 'Gestion de stock, affaires, trésorerie et factures',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MEM AUTO' },
};

export const viewport: Viewport = {
  themeColor: '#0F1B3D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
