'use client';

import { useEffect, useState } from 'react';
import { publicApi } from '@/lib/api';
import { cleanFormAnswers } from '@/lib/checks';
import { readCheckShare, type SharedCheck } from '@/lib/checkShare';
import type { CheckKind } from '@/lib/forms';

export type SharedState = { state: 'none' } | { state: 'loading' } | { state: 'invalid' } | { state: 'ok'; check: SharedCheck };

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * A Stage 2 / ERP check report opened from a link instead of this device:
 * a share link (#r=…) or the short link from the CRM (#id=…&k=…, loaded from the server).
 */
export function useSharedCheck(kind: CheckKind): SharedState {
  const [shared, setShared] = useState<SharedState>({ state: 'loading' });

  useEffect(() => {
    // Re-read whenever the hash changes; only the newest request may win.
    let current = 0;
    const load = () => {
      const mine = ++current;
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const id = params.get('id');
      const k = params.get('k');
      if (!id || !k || params.has('r')) {
        const s = readCheckShare(kind);
        return setShared(s === null ? { state: 'none' } : s === 'invalid' ? { state: 'invalid' } : { state: 'ok', check: s });
      }
      setShared({ state: 'loading' });
      publicApi
        .report(id, k)
        .then((d) => {
          if (mine !== current) return;
          if (d.kind !== kind) return setShared({ state: 'invalid' });
          const details = (d.details ?? {}) as { company?: unknown; owner?: unknown };
          setShared({
            state: 'ok',
            check: { answers: cleanFormAnswers(d.answers), businessName: text(details.company), ownerName: text(details.owner), completedAt: d.completedAt ?? undefined },
          });
        })
        .catch(() => mine === current && setShared({ state: 'invalid' }));
    };
    load();
    window.addEventListener('hashchange', load);
    return () => {
      current++;
      window.removeEventListener('hashchange', load);
    };
  }, [kind]);

  return shared;
}
