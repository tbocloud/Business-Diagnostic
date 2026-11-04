'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/results/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { ReportFrame } from '@/components/forms/ReportFrame';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { publicApi } from '@/lib/api';
import { cleanFormAnswers } from '@/lib/checks';
import { computeDeep, stage1From } from '@/lib/deep';
import { useDeep } from '@/lib/forms';
import { useCheck } from '@/lib/store';
import { DeepReport } from './DeepReport';

type Shared = { state: 'none' } | { state: 'loading' } | { state: 'invalid' } | { state: 'ok'; answers: ReturnType<typeof cleanFormAnswers>; name: string };

/** The client's own Stage 2 report, or one opened from its link (/deep/results/#id=…&k=…, e.g. from the CRM). */
export function DeepResultsApp() {
  const hydrated = useHasHydrated();
  const answers = useDeep((s) => s.answers);
  const completedAt = useDeep((s) => s.completedAt);
  const submissionId = useDeep((s) => s.submissionId);
  const token = useDeep((s) => s.submissionToken);
  const stage1 = useCheck((s) => s.answers);
  const name = useCheck((s) => s.profile.businessName);
  const industry = useCheck((s) => s.profile.industry);
  const [shared, setShared] = useState<Shared>({ state: 'none' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const id = params.get('id');
    const k = params.get('k');
    if (!id || !k) return;
    setShared({ state: 'loading' });
    publicApi
      .report(id, k)
      .then((d) => {
        if (d.kind !== 'deep') return setShared({ state: 'invalid' });
        const details = (d.details ?? {}) as { company?: unknown };
        setShared({ state: 'ok', answers: cleanFormAnswers(d.answers), name: typeof details.company === 'string' ? details.company : '' });
      })
      .catch(() => setShared({ state: 'invalid' }));
  }, []);

  const results = useMemo(() => {
    if (shared.state === 'ok') return computeDeep(shared.answers, stage1From(shared.answers));
    return computeDeep(answers, stage1, industry);
  }, [shared, answers, stage1, industry]);

  if (!hydrated || shared.state === 'loading') {
    return (
      <ReportFrame>
        <PageSkeleton variant="report" />
      </ReportFrame>
    );
  }
  if (shared.state === 'invalid') {
    return (
      <ReportFrame>
        <EmptyState title="This report link doesn’t work" body="It may be incomplete. Ask whoever sent it for the full link." cta={{ href: '/', label: 'Go to the start' }} />
      </ReportFrame>
    );
  }
  if (shared.state === 'none' && !completedAt) {
    return (
      <ReportFrame>
        <EmptyState title="No Stage 2 report yet" body="Answer the Stage 2 questions — your real numbers — and your report appears here." cta={{ href: '/deep', label: 'Start Stage 2' }} />
      </ReportFrame>
    );
  }
  return (
    <ReportFrame>
      <DeepReport
        results={results}
        businessName={shared.state === 'ok' ? shared.name : name}
        own={shared.state === 'none' ? { submissionId, token } : undefined}
      />
    </ReportFrame>
  );
}
