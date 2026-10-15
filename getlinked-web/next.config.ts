import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Three.js ships modern ESM; let Next optimize the barrel imports we use most.
  experimental: {
    optimizePackageImports: ['@react-three/drei'],
  },
};

export default nextConfig;
