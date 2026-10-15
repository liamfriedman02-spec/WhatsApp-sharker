// Rewrites a static export (./out) so it works from any sub-folder, e.g. a design-preview host.
// Usage: STATIC_EXPORT=1 next build && node scripts/relativize-export.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'out';
const html = join(out, 'index.html');
let page = readFileSync(html, 'utf8');
page = page
  .replace(/(?<=["'(])\/_next\//g, './_next/')
  .replace(/(?<=\\")\/_next\//g, './_next/')
  .replace(/(?<=["'])\/icon\.svg/g, './icon.svg');
writeFileSync(html, page);

const chunks = join(out, '_next/static/chunks');
for (const file of readdirSync(chunks)) {
  if (!file.startsWith('turbopack-') || !file.endsWith('.js')) continue;
  const path = join(chunks, file);
  writeFileSync(path, readFileSync(path, 'utf8').replace(':"/_next/"', ':"./_next/"'));
}
console.log('Export rewritten to relative paths in ./out');
