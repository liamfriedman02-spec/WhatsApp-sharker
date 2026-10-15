import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'] },
  {
    // The 3D world updates three.js materials and the camera inside R3F's frame loop,
    // outside React's render, which is how react-three-fiber is meant to be used.
    files: ['src/world/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
];

export default config;
