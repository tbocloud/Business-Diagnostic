// ─────────────────────────────────────────────────────────────
// The site can live in a sub-folder (e.g. https://host/Business_Diagnostic_TBO/).
// Set it once in web/.env.production → NEXT_PUBLIC_BASE_PATH. Next.js adds it to every
// <Link>, router.push and asset automatically; use these helpers only for addresses built
// by hand (fetch to the PHP API, full links to copy or share, window.open).
// ─────────────────────────────────────────────────────────────

export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/** '/results/' → '/Business_Diagnostic_TBO/results/' */
export function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Full address on this site, for copying or sharing. Browser only. */
export function siteUrl(path: string): string {
  return `${window.location.origin}${withBase(path)}`;
}
