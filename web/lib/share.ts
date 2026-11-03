import { siteUrl } from './basePath';
import { normalizeReport } from './normalize';
import type { Answers, Profile } from './types';

// A results link carries the answers inside the URL hash (#r=...), so a client can
// send their dashboard to a consultant without any server or database.
// The hash never leaves the browser — it isn't sent to the web server.

interface Payload {
  v: 1;
  p: Profile;
  a: Answers;
  t?: string; // completedAt
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Drop empty/skipped answers to keep links short. */
function compact(answers: Answers): Answers {
  const out: Answers = {};
  for (const [id, a] of Object.entries(answers)) {
    if (a.skipped) out[id] = { selected: [], skipped: true };
    else if (typeof a.value === 'number') out[id] = { selected: [], value: a.value };
    else if (a.selected.length || a.other?.trim()) out[id] = { selected: a.selected, ...(a.other?.trim() ? { other: a.other.trim() } : {}) };
  }
  return out;
}

export function encodeResults(profile: Profile, answers: Answers, completedAt?: string): string {
  const payload: Payload = { v: 1, p: profile, a: compact(answers), ...(completedAt ? { t: completedAt } : {}) };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeResults(token: string): { profile: Profile; answers: Answers; completedAt?: string } | null {
  try {
    // The token is untrusted URL input — anyone can edit it.
    const data = JSON.parse(fromBase64Url(token)) as Partial<Payload> | null;
    if (!data || data.v !== 1) return null;
    const report = normalizeReport(data.p, data.a);
    if (!report) return null;
    return { ...report, completedAt: typeof data.t === 'string' ? data.t : undefined };
  } catch {
    return null;
  }
}

/** Full shareable URL for the results page. Call in the browser only. */
export function shareUrl(profile: Profile, answers: Answers, completedAt?: string): string {
  return siteUrl(`/results/#r=${encodeResults(profile, answers, completedAt)}`);
}

/** Read a shared token from the current URL hash, if any. Call in the browser only. */
export function readSharedFromHash(): ReturnType<typeof decodeResults> {
  const m = window.location.hash.match(/[#&]r=([A-Za-z0-9_-]+)/);
  return m ? decodeResults(m[1]) : null;
}
