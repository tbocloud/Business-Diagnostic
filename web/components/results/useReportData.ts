'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { computeResults, isAnswered } from '@/lib/engine';
import { publicApi } from '@/lib/api';
import { normalizeReport } from '@/lib/normalize';
import { encodeResults, readSharedFromHash } from '@/lib/share';
import { useCheck } from '@/lib/store';
import type { Answers, Profile, Results } from '@/lib/types';

export interface ReportSource {
  profile: Profile;
  answers: Answers;
  completedAt?: string;
}

export type ReportData =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'empty'; inProgress: boolean }
  | {
      status: 'ready';
      source: ReportSource;
      results: Results;
      isShared: boolean;
      /** "#r=…" when viewing a shared link (so the dashboard and review mode can pass it along), else "". */
      hash: string;
    };

type Shared = { kind: 'none' } | { kind: 'ok'; data: ReportSource; hash: string } | { kind: 'invalid' };

function readShared(): Shared {
  if (!/[#&]r=/.test(window.location.hash)) return { kind: 'none' };
  const d = readSharedFromHash();
  return d ? { kind: 'ok', data: d, hash: window.location.hash } : { kind: 'invalid' };
}

/**
 * One source of truth for the dashboard and review mode:
 * a shared link (#r=…) wins; otherwise the client's own saved answers on this device.
 */
export function useReportData(): ReportData {
  const hydrated = useHasHydrated();
  const profile = useCheck((s) => s.profile);
  const answers = useCheck((s) => s.answers);
  const completedAt = useCheck((s) => s.completedAt);
  const [shared, setShared] = useState<Shared | null>(null);

  useEffect(() => {
    // Re-read whenever the part after "#" changes, and only ever apply the newest answer
    // (an older, slower request must not overwrite a newer one).
    let current = 0;
    const load = () => {
      const mine = ++current;
      // Short link from the CRM: /results/#id=123&k=… — load that report from the server.
      // The id and key sit after "#", so browsers never send them to the server (no access-log
      // or Referer exposure). The report then behaves exactly like a shared (#r=) link.
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const id = params.get('id');
      const k = params.get('k');
      if (!id || !k || params.has('r')) return setShared(readShared());
      setShared(null); // loading
      publicApi
        .report(id, k)
        .then((d) => {
          if (mine !== current) return;
          const report = normalizeReport(d.profile, d.answers);
          if (!report) return setShared({ kind: 'invalid' });
          const completedAt = d.completedAt ?? undefined;
          setShared({
            kind: 'ok',
            data: { ...report, completedAt },
            hash: `#r=${encodeResults(report.profile, report.answers, completedAt)}`,
          });
        })
        .catch(() => mine === current && setShared({ kind: 'invalid' }));
    };
    load();
    window.addEventListener('hashchange', load);
    return () => {
      current = -1; // ignore anything still in flight
      window.removeEventListener('hashchange', load);
    };
  }, []);

  const own: ReportSource | null = useMemo(() => {
    const anyAnswer = Object.values(answers).some(isAnswered);
    return completedAt || anyAnswer ? { profile, answers, completedAt } : null;
  }, [profile, answers, completedAt]);

  const source = shared?.kind === 'ok' ? shared.data : own;
  const results = useMemo(() => (source ? computeResults(source.profile, source.answers) : null), [source]);

  if (!hydrated || shared === null) return { status: 'loading' };
  if (shared.kind === 'invalid') return { status: 'invalid' };
  if (!source || !results) return { status: 'empty', inProgress: profile.businessName.trim().length > 0 };
  return {
    status: 'ready',
    source,
    results,
    isShared: shared.kind === 'ok',
    hash: shared.kind === 'ok' ? shared.hash : '',
  };
}
