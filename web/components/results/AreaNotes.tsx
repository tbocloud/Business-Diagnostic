'use client';

import clsx from 'clsx';
import { ArrowUpRight, Check, ChevronDown, SkipForward, X } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Insight, SectionId, SectionResult } from '@/lib/types';
import { SectionHeader } from './SectionHeader';

function NoteList({ title, items, mark }: { title: string; items: Insight[]; mark: 'good' | 'watch' | 'gap' }) {
  if (!items.length) return null;
  const Mark = mark === 'good' ? Check : mark === 'watch' ? ArrowUpRight : X;
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-2">
        <Mark
          aria-hidden="true"
          strokeWidth={2.5}
          className={clsx('h-3.5 w-3.5', mark === 'good' ? 'text-ok-ink' : mark === 'watch' ? 'text-warn-ink' : 'text-risk-ink')}
        />
        {title}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i.questionId} className="text-[14.5px] leading-snug text-ink">
            {i.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaCard({ s, open, onToggle }: { s: SectionResult; open: boolean; onToggle: () => void }) {
  const muted = s.status === 'not-assessed';
  const bodyId = `area-${s.id}`;
  const hasWorking = s.strengths.length > 0 || s.watch.length > 0;
  return (
    <li className={clsx('print-avoid-break print-plain rounded-[20px] border shadow-card', muted ? 'border-line/70 bg-card/70' : 'border-line bg-card')}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-[64px] w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left hover:bg-paper/50 sm:gap-4 sm:px-5"
        >
          <span
            aria-hidden="true"
            className={clsx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
              muted ? 'bg-na-soft text-na-ink' : 'bg-brand-soft text-brand',
            )}
          >
            <Icon name={s.icon} className="h-5 w-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span className={clsx('text-[15.5px] font-semibold leading-tight', muted ? 'text-ink-2' : 'text-ink')}>{s.title}</span>
            <StatusBadge status={s.status} size="sm" className="self-start sm:self-auto" />
          </span>
          <span className="text-right">
            <span className={clsx('font-display block text-[26px] font-medium leading-none', muted ? 'text-muted' : 'text-ink')}>
              {s.score ?? '—'}
            </span>
            <span className="text-[11.5px] text-muted">{s.score === null ? 'no score' : '/ 100'}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={clsx('no-print h-5 w-5 shrink-0 text-ink-2 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </h3>
      <div
        id={bodyId}
        data-open={open}
        className="collapsible border-t border-line px-4 pb-5 pt-4 sm:px-5 print:pb-3 print:pt-3 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-8 print:grid print:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] print:gap-x-6"
      >
        <div>
          <p className={clsx('text-[15px] leading-relaxed', muted ? 'text-ink-2' : 'text-ink')}>{s.note}</p>
          {s.ownWords.length > 0 && (
            <div className="mt-4 rounded-xl bg-paper px-4 py-3">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-2">In your own words</h4>
              <ul className="mt-2 space-y-3">
                {s.ownWords.map((w) => (
                  <li key={w.questionId}>
                    <p className="text-[12.5px] leading-snug text-muted">{w.question}</p>
                    <blockquote className="font-display font-display-italic mt-0.5 text-[16.5px] leading-snug text-ink">
                      “{w.answer}”
                    </blockquote>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.skipped > 0 && (
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted">
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
              {s.skipped} question{s.skipped === 1 ? '' : 's'} skipped
            </p>
          )}
        </div>
        {!muted && (
          <>
            <div className={clsx('mt-4 space-y-4 md:mt-0', !hasWorking && 'hidden md:block print:block')}>
              <NoteList title="What’s working" items={s.strengths} mark="good" />
              <NoteList title="Could be stronger" items={s.watch} mark="watch" />
            </div>
            <div className={clsx('mt-4 md:mt-0', !s.gaps.length && 'hidden md:block print:block')}>
              <NoteList title="Needs work" items={s.gaps} mark="gap" />
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/** One full-width card per area — no holes between open and closed cards. All cards print expanded. */
export function AreaNotes({ sections, openFirst }: { sections: SectionResult[]; openFirst?: SectionId }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.id === openFirst])),
  );
  const allOpen = sections.every((s) => open[s.id]);

  return (
    <section aria-labelledby="notes-title">
      <SectionHeader
        id="notes-title"
        eyebrow="Area by area"
        title="Notes for each area"
        lead="What’s working, what could be stronger and what needs work — in each part of the business."
        action={
          <button
            type="button"
            onClick={() => setOpen(Object.fromEntries(sections.map((s) => [s.id, !allOpen])))}
            className="no-print inline-flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-semibold text-brand hover:bg-brand-soft/60"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        }
      />
      <ul className="space-y-2.5 print:space-y-2">
        {sections.map((s) => (
          <AreaCard key={s.id} s={s} open={!!open[s.id]} onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))} />
        ))}
      </ul>
    </section>
  );
}
