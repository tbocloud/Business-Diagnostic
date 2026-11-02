'use client';

import clsx from 'clsx';
import { BarChart3, ChevronRight, Table2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { SectionId, SectionResult } from '@/lib/types';
import { stagePhrase } from './labels';
import { SectionHeader } from './SectionHeader';

const TICKS = [0, 25, 50, 75, 100];

/**
 * The direct label normally sits just past the bar tip. When the tip is just below the target,
 * a label there would collide with (or appear to belong to) the target tick — so it becomes a
 * small tag tucked inside the bar end instead. It never jumps past the tick.
 */
function labelInside(score: number, target: number) {
  return score < target && target - score < 14;
}

function gapText(s: SectionResult) {
  if (s.score === null) return 'Not assessed';
  const d = s.score - s.target;
  if (d === 0) return 'Right on target';
  return d > 0 ? `${d} above target` : `${-d} below target`;
}

/** The plot area of one row. `right-9` reserves room so the label at 100 still fits. */
export function BarTrack({
  s,
  tooltipOpen = false,
  thin = false,
}: {
  s: SectionResult;
  tooltipOpen?: boolean;
  thin?: boolean;
}) {
  const assessed = s.score !== null;
  const score = s.score ?? 0;
  const inside = assessed && labelInside(score, s.target);
  // Tooltip goes beside the bar (not over the rows above). Right of the tip when there is room, else left of it.
  const anchor = Math.max(score, s.target);
  const tipRight = anchor <= 66;
  return (
    <div className={clsx('relative', thin ? 'h-6' : 'h-9')}>
      <div className="absolute inset-y-0 left-0 right-9">
        {/* recessive hairline grid */}
        {TICKS.map((t) => (
          <span
            key={t}
            aria-hidden="true"
            className={clsx('absolute inset-y-0 w-px', t === 0 ? 'bg-line-strong' : 'bg-line/80')}
            style={{ left: `${t}%` }}
          />
        ))}
        {assessed ? (
          <>
            <span
              aria-hidden="true"
              className={clsx(
                'bar-grow absolute left-0 top-1/2 -translate-y-1/2 rounded-r-[4px] bg-data transition-[filter]',
                tooltipOpen && 'brightness-110',
                thin ? 'h-2.5' : 'h-[14px]',
              )}
              style={{ width: `${score}%` }}
            />
            <span
              aria-hidden="true"
              className={clsx('absolute top-1/2 w-[2.5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink', thin ? 'h-4' : 'h-6')}
              style={{ left: `${s.target}%` }}
            />
            {inside ? (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute top-1/2 -translate-y-1/2 rounded-[5px] bg-card font-semibold tabular-nums leading-none text-ink shadow-[0_0_0_1px_rgb(var(--data))]',
                  thin ? 'px-1 py-[2px] text-[10px]' : 'px-1.5 py-[3px] text-[13px]',
                )}
                style={{ right: `calc(${100 - score}% + 3px)` }}
              >
                {score}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute top-1/2 -translate-y-1/2 pl-2 font-semibold tabular-nums text-ink',
                  thin ? 'text-[11px]' : 'text-[14px]',
                )}
                style={{ left: `${score}%` }}
              >
                {score}
              </span>
            )}
          </>
        ) : (
          <span aria-hidden="true" className="absolute left-2 top-1/2 -translate-y-1/2 text-[13px] italic text-muted">
            {s.skipped > 0 ? 'Skipped — not in your score' : 'Not enough answers'}
          </span>
        )}
        {assessed && tooltipOpen && (
          <span
            role="presentation"
            className="pointer-events-none absolute top-1/2 z-10 w-max min-w-[11rem] -translate-y-1/2 animate-fade rounded-xl border border-line bg-card px-3 py-2.5 text-left shadow-lift"
            style={
              tipRight
                ? { left: `calc(${anchor}% + 40px)` }
                : { right: `calc(${100 - Math.min(score, s.target)}% + 14px)` }
            }
          >
            <span className="flex items-baseline gap-1">
              <span className="font-display text-[22px] font-semibold leading-none text-ink">{s.score}</span>
              <span className="text-[12px] text-muted">/ 100</span>
            </span>
            <span className="mt-1 block text-[12.5px] font-semibold text-ink">{s.title}</span>
            <span className="block text-[12px] text-ink-2">
              Target {s.target} · {gapText(s)}
            </span>
            <span className="block text-[12px] text-muted">
              {s.answered} of {s.asked} questions answered
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export function AreaScores({
  sections,
  target,
  levelLabel,
  onOpenArea,
}: {
  sections: SectionResult[];
  target: number;
  levelLabel: string;
  /** Adds a "What to do" button to each area, opening its next steps. */
  onOpenArea?: (id: SectionId) => void;
}) {
  // Desktop columns: name · bar · status (· "What to do" button)
  const cols = onOpenArea ? 'md:grid-cols-[14.5rem_minmax(0,1fr)_8.5rem_7.5rem]' : 'md:grid-cols-[14.5rem_minmax(0,1fr)_9rem]';
  const [table, setTable] = useState(false);
  const tableId = useId();
  // One tooltip at a time: the hovered row wins, otherwise the keyboard-focused row.
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const activeId = hoverId ?? focusId;

  return (
    <section aria-labelledby="area-scores-title" className="print-avoid-break">
      <SectionHeader
        id="area-scores-title"
        eyebrow="Area scores"
        title="How each area is doing"
        lead={`Your score out of 100 in each area, against the guide target for ${stagePhrase(levelLabel)} (${target}).${onOpenArea ? ' Tap “What to do” on any area for your next steps.' : ''}`}
      />
      <div className="rounded-[24px] border border-line bg-card p-4 shadow-card print-plain sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ul
            className={clsx('flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2', table && 'invisible')}
            aria-label="Legend"
            aria-hidden={table || undefined}
          >
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-5 rounded-r-[3px] bg-data" />
              Your score
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-4 w-[2.5px] rounded-full bg-ink" />
              Target for your stage ({target})
            </li>
          </ul>
          <button
            type="button"
            onClick={() => setTable((t) => !t)}
            aria-expanded={table}
            aria-controls={tableId}
            className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand hover:bg-brand-soft/60"
          >
            {table ? <BarChart3 className="h-4 w-4" aria-hidden="true" /> : <Table2 className="h-4 w-4" aria-hidden="true" />}
            {table ? 'Show as chart' : 'Show as table'}
          </button>
        </div>

        {table ? (
          <div id={tableId} className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-[14px]">
              <caption className="sr-only">Score for each area of the business, with the target for your stage</caption>
              <thead>
                <tr className="border-b border-line-strong text-[12px] uppercase tracking-[0.08em] text-muted">
                  <th scope="col" className="px-2 py-2 font-semibold">Area</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Your score</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Target</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Answered</th>
                  {onOpenArea && (
                    <th scope="col" className="no-print px-2 py-2 text-right font-semibold">
                      Next steps
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-2 py-2.5 font-medium text-ink">{s.title}</th>
                    <td className="px-2 py-2.5 text-right tabular-nums">{s.score ?? '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{s.target}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {s.answered} of {s.asked}
                    </td>
                    {onOpenArea && (
                      <td className="no-print px-2 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenArea(s.id)}
                          aria-label={`What to do next: ${s.title}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-brand/30 bg-card px-3 text-[13px] font-semibold text-brand hover:border-brand hover:bg-brand-soft/50"
                        >
                          What to do
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <ul id={tableId} className="divide-y divide-line/70">
              {sections.map((s) => (
                <li key={s.id}>
                  <div
                    tabIndex={0}
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={(e) => setFocusId(e.currentTarget.matches(':focus-visible') ? s.id : null)}
                    onBlur={() => setFocusId(null)}
                    aria-label={`${s.title}: ${s.score === null ? 'not assessed' : `${s.score} out of 100, target ${s.target}, ${gapText(s).toLowerCase()}`}. Status: ${s.statusLabel}. ${s.answered} of ${s.asked} questions answered.`}
                    className={clsx(
                      'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-1 py-2.5 outline-offset-0 hover:bg-paper/60 md:gap-x-5',
                      cols,
                      s.score === null && 'opacity-75',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon name={s.icon} className="h-[18px] w-[18px] shrink-0 text-ink-2" />
                      <span className="text-[14.5px] font-medium leading-snug text-ink">{s.title}</span>
                    </span>
                    <span className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                      <BarTrack s={s} tooltipOpen={activeId === s.id} />
                    </span>
                    <span className="col-start-2 row-start-1 justify-self-end md:col-start-auto md:row-start-auto">
                      <StatusBadge status={s.status} size="sm" />
                    </span>
                    {onOpenArea && (
                      <span className="no-print col-span-2 row-start-3 justify-self-end md:col-span-1 md:row-start-auto">
                        <button
                          type="button"
                          onClick={() => onOpenArea(s.id)}
                          aria-label={`What to do next: ${s.title}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-brand/30 bg-card px-3 text-[13px] font-semibold text-brand transition-colors hover:border-brand hover:bg-brand-soft/50"
                        >
                          What to do
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {/* x-axis */}
            <div
              aria-hidden="true"
              className={clsx('mt-1 grid grid-cols-1 gap-x-5 px-1', cols)}
            >
              <span className="hidden md:block" />
              <div className="relative h-5 md:col-start-2">
                <div className="absolute inset-y-0 left-0 right-9">
                  {TICKS.map((t) => (
                    <span
                      key={t}
                      className="absolute top-0.5 -translate-x-1/2 text-[11px] tabular-nums text-muted"
                      style={{ left: `${t}%` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
