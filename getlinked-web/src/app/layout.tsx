import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const funnelDisplay = localFont({
  src: './fonts/funnel-display-latin.woff2',
  variable: '--font-funnel-display',
  weight: '300 800',
  display: 'swap',
});

const funnelSans = localFont({
  src: './fonts/funnel-sans-latin.woff2',
  variable: '--font-funnel-sans',
  weight: '300 800',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  variable: '--font-geist-mono',
  weight: '400 600',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://getlinked.io'),
  title: 'GetLinked | Your Entire Affiliate Traffic. One Powerful Platform.',
  description:
    'GetLinked is the most advanced affiliate management platform for Finance and iGaming: intelligent lead distribution, automated reshuffling, partner management and real-time tracking in one platform.',
  openGraph: {
    title: 'GetLinked | Your Entire Affiliate Traffic. One Powerful Platform.',
    description: 'The most advanced affiliate management platform for Finance and iGaming.',
    type: 'website',
  },
  // NOINDEX=1 keeps copies hosted away from getlinked.io (e.g. GitHub Pages) out of search results.
  robots: process.env.NOINDEX === '1' ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#0a5c44',
  colorScheme: 'light',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${funnelDisplay.variable} ${funnelSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Marks JS as available before first paint, so intro animations start hidden instead of flashing. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
