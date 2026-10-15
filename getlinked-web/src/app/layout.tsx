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
  title: 'GetLinked | The Most Advanced Finance & iGaming Tracking Platform',
  description:
    'Track every click. Route every lead. Control every outcome. The complete performance infrastructure for affiliate tracking, intelligent lead distribution, and network management.',
  openGraph: {
    title: 'GetLinked | The Most Advanced Finance & iGaming Tracking Platform',
    description: 'Track every click. Route every lead. Control every outcome.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#08111f',
  colorScheme: 'dark',
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
