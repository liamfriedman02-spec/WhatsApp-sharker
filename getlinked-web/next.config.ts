import type { NextConfig } from 'next';

// STATIC_EXPORT=1 builds a static copy into ./out for design previews.
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(staticExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
