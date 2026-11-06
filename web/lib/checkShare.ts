import { siteUrl } from './basePath';
import { cleanFormAnswers } from './checks';
import type { CheckKind, FormAnswers } from './forms';
import { compactAnswers, fromBase64Url, toBase64Url } from './share';

// Share links for Stage 2 and the ERP check, like Stage 1's: the answers travel inside the
// URL hash (#r=…), which never reaches the web server.

interface Payload {
  v: 1;
  k: CheckKind;
  a: FormAnswers;
  n?: string; // business name
  o?: string; // owner name
  t?: string; // completedAt
}

export interface SharedCheck {
  answers: FormAnswers;
  businessName: string;
  ownerName: string;
  completedAt?: string;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function checkShareUrl(kind: CheckKind, c: SharedCheck): string {
  const payload: Payload = {
    v: 1,
    k: kind,
    a: compactAnswers(c.answers),
    ...(c.businessName.trim() ? { n: c.businessName.trim() } : {}),
    ...(c.ownerName.trim() ? { o: c.ownerName.trim() } : {}),
    ...(c.completedAt ? { t: c.completedAt } : {}),
  };
  return siteUrl(`/${kind}/results/#r=${toBase64Url(JSON.stringify(payload))}`);
}

/** The report in the URL hash, if any: null when there is none, 'invalid' when it can't be read. */
export function readCheckShare(kind: CheckKind): SharedCheck | 'invalid' | null {
  const m = window.location.hash.match(/[#&]r=([A-Za-z0-9_-]*)/);
  if (!m) return null;
  try {
    // Untrusted URL input — anyone can edit it.
    const data = JSON.parse(fromBase64Url(m[1])) as Partial<Payload> | null;
    if (!data || data.v !== 1 || data.k !== kind) return 'invalid';
    return {
      answers: cleanFormAnswers(data.a),
      businessName: text(data.n, 120),
      ownerName: text(data.o, 120),
      completedAt: typeof data.t === 'string' && !Number.isNaN(Date.parse(data.t)) ? data.t : undefined,
    };
  } catch {
    return 'invalid';
  }
}
