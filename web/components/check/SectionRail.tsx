'use client';

import clsx from 'clsx';
import { Check, ChevronDown, SkipForward, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { SECTIONS } from '@/lib/sections';
import type { RailState } from './flow';

export interface RailItem {
  step: number;
  title: string;
  icon?: string;
  state: RailState;
  /** e.g. "Question 2 of 5" for the current section. */
  detail?: string;
}

export function buildRailItems(states: RailState[], currentStep: number, currentDetail?: string): RailItem[] {
  return [
    { step: 0, title: 'About your business', state: states[0], detail: currentStep === 0 ? currentDetail : undefined },
    ...SECTIONS.map((s, i) => ({
      step: i + 1,
      title: s.title,
      icon: s.icon,
      state: states[i + 1],
      detail: currentStep === i + 1 ? currentDetail : undefined,
    })),
  ];
}

const STATE_TEXT: Record<RailState, string> = {
  done: 'Done',
  current: 'You are here',
  upcoming: 'Coming up',
  skipped: 'Skipped',
};

function Marker({ item }: { item: RailItem }) {
  const common = 'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors';
  if (item.state === 'done')
    return (
      <span className={clsx(common, 'bg-brand text-white')}>
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  if (item.state === 'skipped')
    return (
      <span className={clsx(common, 'border border-line-strong bg-paper-deep text-muted')}>
        <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  if (item.state === 'current')
    return (
      <span className={clsx(common, 'border-2 border-brand bg-card text-brand shadow-[0_0_0_4px_rgb(var(--brand)/0.1)]')}>
        {item.step === 0 ? <Store className="h-4 w-4" aria-hidden="true" /> : <Icon name={item.icon} className="h-4 w-4" />}
      </span>
    );
  return (
    <span className={clsx(common, 'border border-line-strong bg-card font-display text-[12px] font-semibold text-muted')}>
      {item.step === 0 ? <Store className="h-3.5 w-3.5" aria-hidden="true" /> : item.step}
    </span>
  );
}

function RailList({ items, onJump, compact }: { items: RailItem[]; onJump: (step: number) => void; compact?: boolean }) {
  return (
    <ol className="relative">
      {items.map((item, i) => {
        // Forms can be opened in any order — skip ahead or go back freely.
        const clickable = item.state !== 'current';
        const body = (
          <>
            <span className="relative flex flex-col items-center self-stretch">
              <Marker item={item} />
              {i < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'absolute top-8 w-px',
                    compact ? '-bottom-1' : '-bottom-2',
                    item.state === 'done' ? 'bg-brand/40' : 'bg-line-strong/70',
                  )}
                />
              )}
            </span>
            <span className="min-w-0 pb-1 pt-1">
              <span
                className={clsx(
                  'block text-[14px] leading-tight',
                  item.state === 'current' ? 'font-semibold text-ink' : item.state === 'upcoming' ? 'text-ink-2' : 'text-ink',
                )}
              >
                {item.title}
              </span>
              <span
                className={clsx(
                  'mt-0.5 block text-[12px]',
                  item.state === 'current' ? 'font-medium text-accent-ink' : 'text-muted',
                )}
              >
                {item.detail ?? STATE_TEXT[item.state]}
              </span>
            </span>
          </>
        );
        return (
          <li key={item.step} className={compact ? 'pb-1' : 'pb-2'}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onJump(item.step)}
                className="group flex min-h-[44px] w-full items-start gap-3 rounded-xl px-2 py-1 text-left hover:bg-card"
                aria-label={`${item.title} — ${STATE_TEXT[item.state]}. Open this part`}
              >
                {body}
              </button>
            ) : (
              <div
                className="flex min-h-[44px] items-start gap-3 px-2 py-1"
                aria-current={item.state === 'current' ? 'step' : undefined}
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function SectionRail({ items, onJump }: { items: RailItem[]; onJump: (step: number) => void }) {
  return (
    <nav aria-label="Your progress" className="sticky top-24">
      <p className="eyebrow mb-4 px-2">Your check-up</p>
      <RailList items={items} onJump={onJump} />
      <p className="mt-6 px-2 text-[12.5px] leading-relaxed text-muted">
        Open any part, in any order — and skip whatever you like. Progress is saved as you go.
      </p>
    </nav>
  );
}

export function MobileStepper({
  items,
  currentStep,
  onJump,
}: {
  items: RailItem[];
  currentStep: number;
  onJump: (step: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = items.find((i) => i.step === currentStep) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-steps"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 text-left shadow-card"
      >
        <span className="grid h-8 min-w-[2.75rem] place-items-center rounded-lg bg-brand-soft px-1.5 font-display text-[13px] font-semibold text-brand">
          {current.step + 1} / {items.length}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink">{current.title}</span>
          {current.detail && <span className="block text-[12px] text-muted">{current.detail}</span>}
        </span>
        <ChevronDown
          className={clsx('h-5 w-5 shrink-0 text-ink-2 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
        <span className="sr-only">{open ? 'Hide all steps' : 'Show all steps'}</span>
      </button>
      {open && (
        <div
          id="mobile-steps"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-20 max-h-[70vh] animate-rise overflow-y-auto rounded-2xl border border-line bg-paper p-2 shadow-sheet"
        >
          <RailList
            compact
            items={items}
            onJump={(s) => {
              setOpen(false);
              onJump(s);
            }}
          />
        </div>
      )}
    </div>
  );
}
