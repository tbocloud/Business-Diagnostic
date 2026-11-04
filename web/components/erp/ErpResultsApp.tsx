'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/results/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { ReportFrame } from '@/components/forms/ReportFrame';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { publicApi } from '@/lib/api';
import { cleanFormAnswers } from '@/lib/checks';
import { computeErp } from '@/lib/erp';
import { useErp } from '@/lib/forms';
import { useCheck } from '@/lib/store';
import { ErpReport } from './ErpReport';

type Shared = { state: 'none' } | { state: 'loading' } | { state: 'invalid' } | { state: 'ok'; answers: ReturnType<typeof cleanFormAnswers>; name: string };

/** The client’s own ERP check report, or one opened from its link (/erp/results/#id=…&k=…, e.g. from the CRM). */
export function ErpResultsApp() {
  const hydrated = useHasHydrated();
  const answers = useErp((s) => s.answers);
  const completedAt = useErp((s) => s.completedAt);
  const submissionId = useErp((s) => s.submissionId);
  const token = useErp((s) => s.submissionToken);
  const ownName = useErp((s) => s.details.businessName);
  const stage1Name = useCheck((s) => s.profile.businessName);
  const profile = useCheck((s) => s.profile);
  const name = ownName || stage1Name;
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
        if (d.kind !== 'erp') return setShared({ state: 'invalid' });
        const details = (d.details ?? {}) as { company?: unknown };
        setShared({ state: 'ok', answers: cleanFormAnswers(d.answers), name: typeof details.company === 'string' ? details.company : '' });
      })
      .catch(() => setShared({ state: 'invalid' }));
  }, []);

  const results = useMemo(() => {
    if (shared.state === 'ok') return computeErp(shared.answers);
    return computeErp(answers, profile);
  }, [shared, answers, profile]);

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
        <EmptyState title="No ERP check report yet" body="Answer the ERP check questions and your report appears here." cta={{ href: '/erp', label: 'Start the ERP check' }} />
      </ReportFrame>
    );
  }
  return (
    <ReportFrame>
      <ErpReport
        results={results}
        businessName={shared.state === 'ok' ? shared.name : name}
        own={shared.state === 'none' ? { submissionId, token } : undefined}
      />
    </ReportFrame>
  );
}
