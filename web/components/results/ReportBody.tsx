'use client';

import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useId, useState } from 'react';
import type { Results, SectionId } from '@/lib/types';
import { ActionPlan } from './ActionPlan';
import { AreaDetail } from './AreaDetail';
import { AreaNotes } from './AreaNotes';
import { AreaScores } from './AreaScores';
import { Insights } from './Insights';
import { KeyPoints } from './KeyPoints';
import { RealGap } from './RealGap';
import { ScoreHero } from './ScoreHero';
import { StatStrip } from './StatStrip';

const PRINT_FOOTNOTE =
  'This check is a guide based on your answers, not an audit. Targets are guide levels for a business at your stage, not industry statistics.';

/**
 * The report itself — shared by the client's results page and the BDE lead page.
 *
 * First view: the overall score and how each area is doing, with "What to do" on every area.
 * Everything else (key points, real gap, strengths & gaps, the 7/30/90-day plan, notes) sits
 * behind "See your full report & action plan". Printing always includes all of it.
 */
export function ReportBody({
  results,
  cta,
  footer,
  compact,
  defaultExpanded = false,
  onGetHelp,
}: {
  results: Results;
  /** Always visible below the report (the client's callback form). */
  cta?: React.ReactNode;
  footer?: React.ReactNode;
  /** Tighter spacing for the admin panel. */
  compact?: boolean;
  /** Start with the full report open (the BDE panel). */
  defaultExpanded?: boolean;
  /** "Get help with …" in an area's panel. */
  onGetHelp?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openArea, setOpenArea] = useState<SectionId | null>(null);
  const fullId = useId();
  const area = results.sections.find((s) => s.id === openArea) ?? null;
  const gap = compact ? 'space-y-10 sm:space-y-14' : 'space-y-14 sm:space-y-20';

  return (
    <div className={`${compact ? 'mt-6' : 'mt-10 sm:mt-12'} ${gap} print:mt-6 print:space-y-8`}>
      {/* ── First view ── */}
      <ScoreHero results={results} />
      <AreaScores sections={results.sections} target={results.target} levelLabel={results.levelLabel} onOpenArea={setOpenArea} />

      <div className="no-print flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={fullId}
          className="group inline-flex min-h-[52px] items-center gap-2.5 rounded-full border border-brand bg-card px-6 text-[15.5px] font-semibold text-brand shadow-card transition-colors hover:bg-brand hover:text-white"
        >
          <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
          {expanded ? 'Hide the full report' : 'See your full report & action plan'}
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
        {!expanded && (
          <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-muted">
            Key points, the real gap behind your biggest headache, strengths and gaps, and your 7 / 30 / 90-day plan.
          </p>
        )}
      </div>

      {/* ── Full report (always in the page, so printing includes it) ── */}
      <div id={fullId} className={expanded ? `${gap} animate-fade` : `hidden print:block ${gap} print:space-y-8`}>
        <div className="flex flex-col gap-10 sm:gap-14 print:gap-6">
          <KeyPoints points={results.keyPoints} sections={results.sections} />
          <StatStrip stats={results.stats} />
          {/* On paper the disclaimer sits under the numbers it qualifies. */}
          <p className="print-only text-[9pt] leading-snug text-muted">{PRINT_FOOTNOTE}</p>
        </div>
        {results.realGap && <RealGap gap={results.realGap} />}
        <Insights strengths={results.strengths} gaps={results.gaps} stats={results.stats} />
        <ActionPlan plan={results.actionPlan} businessName={results.businessName} />
        <AreaNotes sections={results.sections} openFirst={results.realGap?.actual.id} />
      </div>

      {cta}
      {footer}

      <AreaDetail
        section={area}
        levelLabel={results.levelLabel}
        onClose={() => setOpenArea(null)}
        onGetHelp={
          onGetHelp
            ? () => {
                setOpenArea(null);
                onGetHelp();
              }
            : undefined
        }
      />
    </div>
  );
}
