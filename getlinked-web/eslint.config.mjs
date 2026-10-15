import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // The 3D scene mutates three.js objects (uniforms, matrices, shared engine state) every
    // frame inside useFrame. That imperative style is how React Three Fiber is meant to be
    // used, so the React Compiler immutability rule doesn't apply here.
    files: ['src/three/**/*.{ts,tsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
