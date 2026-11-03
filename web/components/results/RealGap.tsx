import clsx from 'clsx';
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { RealGap as RealGapData } from '@/lib/types';

function ScoreVsTarget({ score, target }: { score: number; target: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-display text-[44px] font-medium leading-none tracking-[-0.02em] text-ink">{score}</span>
          <span className="text-[13px] text-muted">/ 100</span>
        </p>
        <p className="text-right text-[13px] text-ink-2">
          Target for your stage <span className="font-semibold text-ink">{target}</span>
        </p>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-data-track" aria-hidden="true">
        <span className="bar-grow absolute inset-y-0 left-0 rounded-full bg-data" style={{ width: `${score}%` }} />
        <span
          className="absolute -top-1.5 h-6 w-[3px] -translate-x-1/2 rounded-full bg-ink ring-2 ring-card"
          style={{ left: `${target}%` }}
        />
      </div>
    </div>
  );
}

export function RealGap({ gap }: { gap: RealGapData }) {
  const { actual, perceived, topIssue, hiddenStrength } = gap;
  // Side-by-side only when there is a real comparison: the client picked one of the listed
  // headaches, which maps to areas. A typed-in headache can't be compared, so it isn't shown
  // as a big quote (the story below still mentions it in their words).
  const twoSided = !!perceived && perceived.sections.length > 0;

  return (
    <section
      aria-labelledby="real-gap-title"
      className="print-avoid-break relative overflow-hidden rounded-[32px] bg-brand px-5 pb-6 pt-8 text-white shadow-sheet sm:px-10 sm:pb-10 sm:pt-11"
    >
      {/* atmosphere: soft light from the top-left, a saffron ember bottom-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-white/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
      />

      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-light">
          <span aria-hidden="true" className="h-px w-6 bg-accent" />
          The real gap
        </p>
        <h2
          id="real-gap-title"
          className="font-display mt-3 max-w-3xl text-balance text-[28px] font-medium leading-[1.12] tracking-[-0.015em] sm:text-[40px]"
        >
          {gap.headline}
        </h2>

        <div
          className={clsx(
            'mt-8 grid items-center gap-3',
            twoSided && 'lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)] lg:gap-5 print:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)]',
          )}
        >
          {twoSided && perceived && (
            <>
              <div className="flex flex-col rounded-[22px] border border-white/15 bg-white/[0.06] p-5 sm:p-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75">Your biggest headache — you told us</p>
                <blockquote className="font-display font-display-italic mt-4 text-[24px] leading-[1.25] text-white sm:text-[30px]">
                  <span aria-hidden="true" className="mr-1 text-accent-light">
                    “
                  </span>
                  {perceived.label}
                  <span aria-hidden="true" className="ml-0.5 text-accent-light">
                    ”
                  </span>
                </blockquote>
                {perceived.sections.length > 0 && (
                  <p className="mt-5 text-[13px] leading-relaxed text-white/75">
                    This usually starts in {perceived.sections.map((s) => s.title).join(' or ')}.
                  </p>
                )}
              </div>
              <div className="grid place-items-center py-1" aria-hidden="true">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-ink shadow-[0_8px_20px_-8px_rgb(0_0_0/0.5)]">
                  <ArrowDown className="h-5 w-5 lg:hidden print:hidden" strokeWidth={2.25} />
                  <ArrowRight className="hidden h-5 w-5 lg:block print:block" strokeWidth={2.25} />
                </span>
              </div>
            </>
          )}

          <div className="rounded-[22px] bg-card p-5 text-ink shadow-lift sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">What your answers show</p>
              <StatusBadge status={actual.status} size="sm" />
            </div>
            <p className="mt-4 flex items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon name={actual.icon} className="h-5 w-5" />
              </span>
              <span className="font-display text-[24px] font-medium leading-tight sm:text-[28px]">{actual.title}</span>
            </p>
            {actual.score !== null && (
              <div className="mt-5">
                <ScoreVsTarget score={actual.score} target={actual.target} />
              </div>
            )}
            {topIssue && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Biggest issue in this area</p>
                <p className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">{topIssue.title}</p>
                <p className="mt-1 text-[14px] text-ink-2">
                  You said: <span className="text-ink">{topIssue.answerLabel}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-7 max-w-3xl text-[15.5px] leading-[1.75] text-white/90 sm:text-[16.5px]">{gap.story}</p>

        {hiddenStrength && hiddenStrength.score !== null && (
          <p className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[14.5px]">
            <Sparkles className="h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
            <span className="text-white/80">Your hidden strength:</span>
            <span className="font-semibold text-white">
              {hiddenStrength.title} ({hiddenStrength.score})
            </span>
            <span className="text-white/80">— build on it.</span>
          </p>
        )}
      </div>
    </section>
  );
}
