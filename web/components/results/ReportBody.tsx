import type { Results } from '@/lib/types';
import { ActionPlan } from './ActionPlan';
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
 * The report itself — shared by the client's results page and the BDE lead page,
 * so both always show exactly the same thing.
 */
export function ReportBody({
  results,
  afterRealGap,
  footer,
  compact,
}: {
  results: Results;
  /** Slot right after "The real gap" (the client's callback form). */
  afterRealGap?: React.ReactNode;
  footer?: React.ReactNode;
  /** Tighter spacing for the admin panel. */
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'mt-6 space-y-10 sm:space-y-14 print:mt-6 print:space-y-8'
          : 'mt-10 space-y-14 sm:mt-12 sm:space-y-20 print:mt-6 print:space-y-8'
      }
    >
      {/* On paper the stat strip shares page one with the score; key points follow. */}
      <div className={compact ? 'flex flex-col gap-10 sm:gap-12 print:gap-6' : 'flex flex-col gap-12 sm:gap-16 print:gap-6'}>
        <ScoreHero results={results} />
        <div className="print:order-last">
          <KeyPoints points={results.keyPoints} sections={results.sections} />
        </div>
        <StatStrip stats={results.stats} />
        {/* On paper the disclaimer sits on page one, under the numbers it qualifies. */}
        <p className="print-only text-[9pt] leading-snug text-muted">{PRINT_FOOTNOTE}</p>
      </div>
      {results.realGap && <RealGap gap={results.realGap} />}
      {afterRealGap}
      <AreaScores sections={results.sections} target={results.target} levelLabel={results.levelLabel} />
      <Insights strengths={results.strengths} gaps={results.gaps} stats={results.stats} />
      <ActionPlan plan={results.actionPlan} businessName={results.businessName} />
      <AreaNotes sections={results.sections} openFirst={results.realGap?.actual.id} />
      {footer}
    </div>
  );
}
