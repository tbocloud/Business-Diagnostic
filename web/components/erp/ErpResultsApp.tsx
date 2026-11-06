'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { CheckCallback } from '@/components/forms/CheckCallback';
import { CheckReportPage, CheckReportState } from '@/components/forms/CheckReportPage';
import { useSharedCheck } from '@/components/forms/useSharedCheck';
import { NextChecks } from '@/components/results/NextChecks';
import { ButtonLink } from '@/components/ui/Button';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { checkShareUrl } from '@/lib/checkShare';
import { computeErp, erpProfileFrom, erpReport, erpToSave } from '@/lib/erp';
import { useDeep, useErp } from '@/lib/forms';
import { useCheck } from '@/lib/store';
import { ErpExtras } from './ErpExtras';

const EMPTY = {
  title: 'No ERP check report yet',
  body: 'Answer the ERP check questions — about 6 minutes — and your report appears here: every gap in your current system and what ERPNext fixes first.',
  cta: { href: '/erp', label: 'Start the ERP check' },
};

/** The client’s own ERP check report, or one opened from a link (#r=… share link, or #id=…&k=… from the CRM). */
export function ErpResultsApp() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const shared = useSharedCheck('erp');
  const answers = useErp((s) => s.answers);
  const completedAt = useErp((s) => s.completedAt);
  const details = useErp((s) => s.details);
  const profile = useCheck((s) => s.profile);
  const stage1Done = useCheck((s) => !!s.completedAt);
  const deepDone = useDeep((s) => !!s.completedAt);

  const view = useMemo(() => {
    if (shared.state === 'ok') {
      const c = shared.check;
      return { ...erpReport(c.answers, erpProfileFrom(c.answers), c.businessName), saved: c.answers, name: c.businessName, ownerName: c.ownerName, completedAt: c.completedAt };
    }
    const name = details.businessName.trim() || profile.businessName.trim();
    return {
      ...erpReport(answers, profile, name),
      saved: erpToSave(answers, profile),
      name,
      ownerName: details.ownerName.trim() || profile.ownerName?.trim() || '',
      completedAt,
    };
  }, [shared, answers, details, profile, completedAt]);

  if (!hydrated || shared.state === 'loading') return <CheckReportState state="loading" empty={EMPTY} />;
  if (shared.state === 'invalid') return <CheckReportState state="invalid" empty={EMPTY} />;
  const isShared = shared.state === 'ok';
  if (!isShared && !completedAt && view.erp.answered === 0) return <CheckReportState state="empty" empty={EMPTY} />;

  const { results, erp } = view;
  const chips = [
    results.industryLabel !== 'Not specified' && { label: 'Industry', value: results.industryLabel },
    erp.current && { label: 'Today on', value: erp.current.label },
    erp.size.users !== undefined && { label: 'Users', value: String(erp.size.users) },
    erp.size.sites !== undefined && { label: erp.size.sites === 1 ? 'Location' : 'Locations', value: String(erp.size.sites) },
  ].filter(Boolean) as { label: string; value: string }[];
  const next: ('health' | 'deep')[] = stage1Done ? (deepDone ? [] : ['deep']) : ['health'];

  return (
    <CheckReportPage
      eyebrow="ERP check"
      results={results}
      ownerName={view.ownerName}
      completedAt={view.completedAt}
      isShared={isShared}
      unfinished={
        !isShared && !completedAt
          ? { href: '/erp', label: 'Continue the check', text: 'Your ERP check isn’t finished, so this report only covers what you’ve answered so far.' }
          : undefined
      }
      chips={chips}
      extraAfterPlan={<ErpExtras erp={erp} />}
      teaser="Key points, the real gap in your system, every gap with what ERPNext does about it, your 7 / 30 / 90-day plan and your ERPNext plan."
      getShareUrl={() => checkShareUrl('erp', { answers: view.saved, businessName: view.name, ownerName: view.ownerName, completedAt: view.completedAt })}
      onEdit={() => {
        useErp.getState().goTo(0);
        router.push('/erp');
      }}
      onReset={() => {
        useErp.getState().reset();
        router.push('/erp');
      }}
      callback={
        isShared ? undefined : (
          <CheckCallback
            kind="erp"
            useStore={useErp}
            points={() => computeErp(useErp.getState().answers, profile).points}
            answers={() => erpToSave(useErp.getState().answers, profile)}
            businessName={results.businessName}
            ownerName={view.ownerName}
            title="See ERPNext close these gaps — on your own data"
            body="Leave a number and we’ll book a free demo of your Phase 1 modules, with your own items, customers and invoices. No obligation."
          />
        )
      }
      next={
        isShared ? undefined : (
          <NextChecks
            show={next}
            title={next.length ? 'Keep going' : 'Your other reports'}
            lead={
              !stage1Done
                ? 'Your system is one part of the picture. See the whole business in about 10 minutes.'
                : next.length
                  ? 'Your answers carry over — nothing is asked twice.'
                  : 'Everything you’ve told us, report by report.'
            }
          >
            {stage1Done && (
              <>
                <ButtonLink href="/results" variant="secondary">
                  Your Stage 1 report
                </ButtonLink>
                {deepDone && (
                  <ButtonLink href="/deep/results" variant="secondary">
                    Your Stage 2 report
                  </ButtonLink>
                )}
              </>
            )}
          </NextChecks>
        )
      }
    />
  );
}
