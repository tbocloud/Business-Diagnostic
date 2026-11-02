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
    // Short link from the CRM: /results/?id=123&k=… — load that report from the server.
    // It then behaves exactly like a shared (#r=) link, so review mode and links keep working.
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const k = params.get('k');
    if (id && k && !/[#&]r=/.test(window.location.hash)) {
      let live = true;
      publicApi
        .report(id, k)
        .then((d) => {
          if (!live) return;
          const report = normalizeReport(d.profile, d.answers);
          if (!report) return setShared({ kind: 'invalid' });
          const completedAt = d.completedAt ?? undefined;
          setShared({
            kind: 'ok',
            data: { ...report, completedAt },
            hash: `#r=${encodeResults(report.profile, report.answers, completedAt)}`,
          });
        })
        .catch(() => live && setShared({ kind: 'invalid' }));
      return () => {
        live = false;
      };
    }
    const update = () => setShared(readShared());
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
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
