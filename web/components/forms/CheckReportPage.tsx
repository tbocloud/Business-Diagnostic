'use client';

import { Eye, Info } from 'lucide-react';
import { ContactCta } from '@/components/results/ContactCta';
import { EmptyState } from '@/components/results/EmptyState';
import { ReportBody } from '@/components/results/ReportBody';
import { ReportHeader } from '@/components/results/ReportHeader';
import { Banner, Frame, scrollToCallback } from '@/components/results/ResultsApp';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { Results } from '@/lib/types';

const FOOTNOTE =
  'This check is a guide based on your answers, not an audit. Targets are guide levels for a business like yours, not industry statistics.';

export const BROKEN_LINK = {
  title: 'This report link looks incomplete',
  body: 'Part of the link may have been cut off when it was copied. Ask for the link again, or run your own free check.',
  cta: { href: '/', label: 'Go to the start' },
};

/** Loading / broken-link / nothing-yet states, in the same frame as the report. */
export function CheckReportState({ state, empty }: { state: 'loading' | 'invalid' | 'empty'; empty: { title: string; body: string; cta: { href: string; label: string } } }) {
  return (
    <Frame>
      {state === 'loading' ? <PageSkeleton variant="report" /> : <EmptyState {...(state === 'invalid' ? BROKEN_LINK : empty)} />}
    </Frame>
  );
}

/**
 * A Stage 2 / ERP check report, laid out exactly like the Stage 1 report: the same header,
 * score, areas with "What to do", key points, real gap, strengths & gaps, 7/30/90-day plan
 * and services — plus the check's own sections (`extra`).
 */
export function CheckReportPage({
  eyebrow,
  results,
  ownerName,
  completedAt,
  isShared,
  unfinished,
  chips,
  extra,
  extraAfterPlan,
  teaser,
  getShareUrl,
  onEdit,
  onReset,
  callback,
  next,
}: {
  eyebrow: string;
  results: Results;
  ownerName: string;
  completedAt?: string;
  isShared: boolean;
  /** The client's own check, not finished yet: where to carry on. */
  unfinished?: { href: string; label: string; text: string };
  chips: { label: string; value: string }[];
  /** The check's own sections, after "Your numbers". */
  extra?: React.ReactNode;
  /** The check's own section after the 7/30/90-day plan. */
  extraAfterPlan?: React.ReactNode;
  teaser: string;
  getShareUrl: () => string;
  onEdit: () => void;
  onReset: () => void;
  /** "Call me back" — the client's own report only. */
  callback?: React.ReactNode;
  /** The other checks — the client's own report only. */
  next?: React.ReactNode;
}) {
  return (
    <Frame wide>
      {isShared && (
        <Banner Icon={Eye} tone="plain" link={{ href: '/', label: 'Run your own free check' }}>
          <span className="font-semibold text-ink">You’re viewing a shared report.</span> Everything on this page comes from the link you opened.
        </Banner>
      )}
      {unfinished && (
        <Banner Icon={Info} tone="accent" link={{ href: unfinished.href, label: unfinished.label }}>
          {unfinished.text}
        </Banner>
      )}

      <ReportHeader
        results={results}
        profile={{ businessName: results.businessName, ownerName, goals: [] }}
        completedAt={completedAt}
        isShared={isShared}
        getShareUrl={getShareUrl}
        onEdit={onEdit}
        onReset={onReset}
        eyebrow={eyebrow}
        chips={chips}
      />

      <ReportBody
        results={results}
        extra={extra}
        extraAfterPlan={extraAfterPlan}
        teaser={teaser}
        cta={callback}
        onGetHelp={callback ? scrollToCallback : undefined}
        footer={
          <>
            {next}
            <ContactCta businessName={results.businessName} />
            <p className="no-print border-t border-line pt-6 text-[13px] leading-relaxed text-muted">{FOOTNOTE}</p>
          </>
        }
      />
    </Frame>
  );
}
