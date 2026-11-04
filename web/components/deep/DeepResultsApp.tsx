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
import { computeDeep, deepReport, industryFrom, stage1From, withStage1 } from '@/lib/deep';
import { rupees, useDeep, useErp } from '@/lib/forms';
import { useCheck } from '@/lib/store';
import { DeepExtras } from './DeepExtras';

const EMPTY = {
  title: 'No Stage 2 report yet',
  body: 'Answer the Stage 2 questions — your real numbers, about 8 minutes — and your report appears here: your profit, your stage, your customers and growth ideas worth money.',
  cta: { href: '/deep', label: 'Start Stage 2' },
};

/** The client's own Stage 2 report, or one opened from a link (#r=… share link, or #id=…&k=… from the CRM). */
export function DeepResultsApp() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const shared = useSharedCheck('deep');
  const answers = useDeep((s) => s.answers);
  const completedAt = useDeep((s) => s.completedAt);
  const details = useDeep((s) => s.details);
  const stage1 = useCheck((s) => s.answers);
  const profile = useCheck((s) => s.profile);
  const stage1Done = useCheck((s) => !!s.completedAt);
  const erpDone = useErp((s) => !!s.completedAt);

  const view = useMemo(() => {
    if (shared.state === 'ok') {
      const c = shared.check;
      return {
        ...deepReport(c.answers, stage1From(c.answers), industryFrom(c.answers), c.businessName),
        saved: c.answers,
        name: c.businessName,
        ownerName: c.ownerName,
        completedAt: c.completedAt,
      };
    }
    const name = details.businessName.trim() || profile.businessName.trim();
    return {
      ...deepReport(answers, stage1, profile.industry, name),
      saved: withStage1(answers, stage1, profile.industry),
      name,
      ownerName: details.ownerName.trim() || profile.ownerName?.trim() || '',
      completedAt,
    };
  }, [shared, answers, details, stage1, profile, completedAt]);

  if (!hydrated || shared.state === 'loading') return <CheckReportState state="loading" empty={EMPTY} />;
  if (shared.state === 'invalid') return <CheckReportState state="invalid" empty={EMPTY} />;
  const isShared = shared.state === 'ok';
  if (!isShared && !completedAt && view.deep.answered === 0) return <CheckReportState state="empty" empty={EMPTY} />;

  const { results, deep } = view;
  const team = deep.stage?.dims.find((d) => d.id === 'team')?.value;
  const chips = [
    deep.stage && { label: 'Stage', value: deep.stage.label },
    results.industryLabel !== 'Not specified' && { label: 'Industry', value: results.industryLabel },
    deep.profit && { label: 'Sales', value: `${rupees(deep.profit.sales)} a month` },
    team && { label: 'Team', value: team },
  ].filter(Boolean) as { label: string; value: string }[];
  const next: ('health' | 'erp')[] = [...(erpDone ? [] : ['erp' as const]), ...(stage1Done ? [] : ['health' as const])];

  return (
    <CheckReportPage
      eyebrow="Stage 2 · Your real numbers"
      results={results}
      ownerName={view.ownerName}
      completedAt={view.completedAt}
      isShared={isShared}
      unfinished={
        !isShared && !completedAt
          ? { href: '/deep', label: 'Continue Stage 2', text: 'Stage 2 isn’t finished, so this report only covers the figures you’ve given so far.' }
          : undefined
      }
      chips={chips}
      extra={<DeepExtras deep={deep} />}
      teaser="Key points, your stage, where every ₹100 goes, growth ideas worth money, strengths and gaps — and your 7 / 30 / 90-day plan."
      getShareUrl={() => checkShareUrl('deep', { answers: view.saved, businessName: view.name, ownerName: view.ownerName, completedAt: view.completedAt })}
      onEdit={() => {
        useDeep.getState().goTo(0);
        router.push('/deep');
      }}
      onReset={() => {
        useDeep.getState().reset();
        router.push('/deep');
      }}
      callback={
        isShared ? undefined : (
          <CheckCallback
            kind="deep"
            useStore={useDeep}
            points={() => computeDeep(useDeep.getState().answers, stage1, profile.industry).points}
            answers={() => withStage1(useDeep.getState().answers, stage1, profile.industry)}
            businessName={results.businessName}
            ownerName={view.ownerName}
            title="Want a plan built on these numbers?"
            body="Leave a number and one of our consultants will go through your figures with you — free, about 30 minutes, no obligation."
          />
        )
      }
      next={
        isShared ? undefined : (
          <NextChecks show={next} title={next.length ? 'Keep going' : 'Your other reports'}
            lead={next.length ? 'Your answers carry over — nothing is asked twice.' : 'Everything you’ve told us, report by report.'}
          >
            {stage1Done && (
              <ButtonLink href="/results" variant="secondary">
                Your Stage 1 report
              </ButtonLink>
            )}
            {erpDone && (
              <ButtonLink href="/erp/results" variant="secondary">
                Your ERP check report
              </ButtonLink>
            )}
          </NextChecks>
        )
      }
    />
  );
}
