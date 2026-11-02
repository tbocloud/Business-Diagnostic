'use client';

import clsx from 'clsx';
import { ArrowRight, CheckCircle2, Lightbulb, PhoneCall, Quote, SkipForward, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Insight, SectionResult } from '@/lib/types';
import { BarTrack } from './AreaScores';
import { EFFORT_META, stagePhrase } from './labels';

/**
 * "What to do" for one area: what the business needs there, why it matters, and the next
 * step for each — plus what is already working and the client's own words.
 * A side panel on desktop, a bottom sheet on phones.
 */
export function AreaDetail({
  section,
  levelLabel,
  onClose,
  onGetHelp,
}: {
  section: SectionResult | null;
  levelLabel: string;
  onClose: () => void;
  /** Shown as "Get help with …" (the client's own report — scrolls to the callback form). */
  onGetHelp?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = !!section;

  // Focus, Esc to close, keep Tab inside, no page scroll behind, focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
    };
  }, [open, onClose]);

  if (!section) return null;
  const s = section;
  // What the business needs here: real gaps first, then "could be stronger", most urgent first.
  const needs: Insight[] = [...s.gaps, ...s.watch];
  const assessed = s.score !== null;

  // Portal to <body>: a `position: fixed` panel inside an animated (transformed) parent
  // would be positioned against that parent instead of the screen.
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-end justify-end md:items-stretch" role="presentation">
      <div className="absolute inset-0 animate-fade bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-detail-title"
        className={clsx(
          'relative flex w-full flex-col bg-paper shadow-sheet',
          'max-h-[92dvh] animate-rise rounded-t-[24px]',
          'md:h-full md:max-h-none md:w-[34rem] md:animate-slide-in md:rounded-none md:rounded-l-[24px]',
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <Icon name={s.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">What to do next</p>
            <h2 id="area-detail-title" className="font-display text-[22px] font-medium leading-tight text-ink sm:text-[24px]">
              {s.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-6">
          {/* Where it stands */}
          <div className="rounded-[18px] border border-line bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-semibold leading-none text-ink">{s.score ?? '—'}</span>
                <span className="text-[13px] text-muted">/ 100 · target {s.target} for {stagePhrase(levelLabel)}</span>
              </p>
              <StatusBadge status={s.status} size="sm" />
            </div>
            {assessed && (
              <div className="mt-3">
                <BarTrack s={s} thin />
              </div>
            )}
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{s.note}</p>
          </div>

          {!assessed ? (
            <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-paper-deep px-4 py-3 text-[14px] text-ink-2">
              <SkipForward className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              This area was skipped, so there’s no advice for it yet. Answer its questions to see what to do here.
            </p>
          ) : (
            <>
              {/* What the business needs + the next step for each */}
              <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">What your business needs here</h3>
              {needs.length === 0 ? (
                <p className="mt-3 flex items-start gap-2.5 rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-[14px] text-ink">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink" aria-hidden="true" />
                  Nothing urgent — this area is in good shape for your stage. Keep doing what you’re doing.
                </p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {needs.map((n, i) => (
                    <NeedCard key={n.questionId} n={n} index={i + 1} />
                  ))}
                </ol>
              )}

              {/* What's already working */}
              {s.strengths.length > 0 && (
                <>
                  <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Already working well</h3>
                  <ul className="mt-3 space-y-2">
                    {s.strengths.map((st) => (
                      <li key={st.questionId} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-ink" aria-hidden="true" />
                        {st.title}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {/* In their own words */}
          {s.ownWords.length > 0 && (
            <>
              <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">In your own words</h3>
              <ul className="mt-3 space-y-2.5">
                {s.ownWords.map((w) => (
                  <li key={w.questionId} className="rounded-xl border border-line bg-card px-3.5 py-2.5">
                    <p className="text-[12.5px] text-muted">{w.question}</p>
                    <p className="mt-0.5 flex gap-1.5 text-[14px] italic text-ink">
                      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" aria-hidden="true" />
                      {w.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {onGetHelp && assessed && needs.length > 0 && (
          <div className="border-t border-line bg-card px-5 py-3.5 sm:px-6">
            <Button className="w-full" onClick={onGetHelp}>
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Get help with {s.short.toLowerCase()}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function NeedCard({ n, index }: { n: Insight; index: number }) {
  const effort = EFFORT_META[n.effort];
  return (
    <li className="overflow-hidden rounded-[16px] border border-line bg-card">
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={clsx(
              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-[12px] font-semibold',
              n.kind === 'gap' ? 'bg-risk-soft text-risk-ink' : 'bg-warn-soft text-warn-ink',
            )}
          >
            {index}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug text-ink">{n.title}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {n.kind === 'gap' ? 'Needs work' : 'Could be stronger'} · You said: <span className="text-ink-2">{n.answerLabel}</span>
            </p>
          </div>
        </div>
        <p className="mt-2 pl-[34px] text-[13.5px] leading-relaxed text-ink-2">{n.why}</p>
      </div>
      <div className="flex items-start gap-2.5 border-t border-line bg-brand-soft/40 px-4 py-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand">
            Next step
            <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal', effort.className)}>
              <effort.Icon className="h-3 w-3" aria-hidden="true" />
              {effort.label}
            </span>
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{n.fix}</p>
        </div>
      </div>
    </li>
  );
}
