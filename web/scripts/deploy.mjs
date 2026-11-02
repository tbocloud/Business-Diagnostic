// ─────────────────────────────────────────────────────────────
// npm run deploy  (from web/)
// Builds the static site and copies it to the repository root, next to /api,
// which is what the PHP host serves. Commit the result and pull/upload as usual.
// ─────────────────────────────────────────────────────────────

import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(web, 'out');
const root = join(web, '..');

// Everything the export produces at the top level. Only these are replaced —
// api/, db/, web/, .htaccess, README etc. are never touched.
const GENERATED = ['_next', 'admin', 'check', 'results', '404', '404.html', 'index.html', 'index.txt', 'icon.svg'];

if (!existsSync(join(out, 'index.html'))) {
  console.error('web/out is missing — run `npm run build` first.');
  process.exit(1);
}

const unexpected = readdirSync(out).filter((f) => !GENERATED.includes(f));
if (unexpected.length) {
  console.error(`The export produced files this script doesn't know about: ${unexpected.join(', ')}.`);
  console.error('Add them to GENERATED in web/scripts/deploy.mjs so old copies get cleaned up.');
  process.exit(1);
}

for (const f of GENERATED) rmSync(join(root, f), { recursive: true, force: true });
for (const f of readdirSync(out)) cpSync(join(out, f), join(root, f), { recursive: true });

console.log(`Copied the static site to ${root}`);
console.log('Next: commit, then deploy as usual (the PHP API in /api is unchanged by this step).');
