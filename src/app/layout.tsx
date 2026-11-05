import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow-cond',
});

export const metadata: Metadata = {
  title: 'MEM AUTOMOTIVE',
  description: 'Gestion de stock, affaires, trésorerie et factures',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'MEM AUTO' },
};

export const viewport: Viewport = {
  themeColor: '#0B1221',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('mem-theme');if(t)document.documentElement.setAttribute('data-theme',t);})()`,
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <ThemeProvider>
          <div className="app-shell">
            <Navigation />
            <div className="main-area">
              {children}
            </div>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '13px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
