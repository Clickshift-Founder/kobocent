import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { Analytics } from '@/components/Analytics';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://kobocent.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Kobocent — Your local kobo, working globally',
  description:
    'Buy stablecoins with local currency, send money across borders, pay bills, withdraw to any bank, trade, and earn up to 14% — all in one place. Multichain, powered by stablecoins.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Kobocent — Your local kobo, working globally',
    description: 'Send, spend, trade and earn. Multichain, powered by stablecoins.',
    url: SITE,
    siteName: 'Kobocent',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kobocent — Your local kobo, working globally',
    description: 'Send, spend, trade and earn. Multichain, powered by stablecoins.',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Kobocent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#F7F3EE',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
