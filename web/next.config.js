/**
 * The site is hosted on plain PHP + MySQL hosting (no Node server), so the UI is exported
 * as static files (`npm run build` → web/out/). `npm run deploy` copies them to the repo root,
 * next to the PHP API in /api.
 *
 * @type {import('next').NextConfig}
 */
module.exports = {
  reactStrictMode: true,
  output: 'export',
  // Sub-folder hosting, e.g. /Business_Diagnostic_TBO — set in web/.env.production.
  basePath: (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, ''),
  // /check → /check/index.html works on Apache without rewrite rules.
  trailingSlash: true,
  images: { unoptimized: true },
};
