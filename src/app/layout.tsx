import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

export const metadata: Metadata = {
  title: 'MEM AUTOMOTIVE — Ordinateur de Bord',
  description: 'Gestion de stock, affaires, trésorerie et factures',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MEM AUTO' },
};

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${barlow.variable} h-full`}>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
