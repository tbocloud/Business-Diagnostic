'use client';

import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ListChecks, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';

// Shared pieces for the "About your business" form and each section form.

interface FormHeaderProps {
  eyebrow: string;
  /** Big faint numeral in the corner ("01"…). */
  numeral: string;
  icon: string;
  title: string;
  intro: string;
  questionCount: number;
  minutes: number;
  /** Extra line under the meta row, e.g. a "you skipped this section" note. */
  note?: React.ReactNode;
  skipLabel: string;
  skipTitle: string;
  skipBody: string;
  onSkipAll: () => void;
}

export function FormHeader({
  eyebrow,
  numeral,
  icon,
  title,
  intro,
  questionCount,
  minutes,
  note,
  skipLabel,
  skipTitle,
  skipBody,
  onSkipAll,
}: FormHeaderProps) {
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  return (
    <header className="relative overflow-hidden rounded-[22px] border border-line bg-card px-5 pb-5 pt-5 shadow-card sm:px-6 sm:pb-6 sm:pt-6">
      <span
        aria-hidden="true"
        className="font-display pointer-events-none absolute -right-1 -top-5 select-none text-[100px] font-light leading-none text-paper-deep sm:text-[130px]"
      >
        {numeral}
      </span>
      <div className="relative">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-[0_12px_24px_-12px_rgb(var(--brand)/0.8)]"
          >
            <Icon name={icon} className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <p className="eyebrow text-brand">{eyebrow}</p>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display mt-3 text-balance text-[22px] font-medium leading-[1.15] tracking-[-0.01em] text-ink outline-none sm:text-[26px]"
        >
          {title}
        </h1>
        <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-ink-2 sm:text-[15px]">{intro}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-medium text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-brand" aria-hidden="true" />
            {questionCount} question{questionCount === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
            about {minutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SkipForward className="h-4 w-4 text-brand" aria-hidden="true" />
            Skip anything you like
          </span>
        </div>
        {note && <div className="mt-4">{note}</div>}

        {!confirming ? (
          <Button variant="secondary" onClick={() => setConfirming(true)} className="mt-4 !min-h-[36px] !px-3 !text-[13px]">
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            {skipLabel}
          </Button>
        ) : (
          <div
            role="alertdialog"
            aria-labelledby="skip-all-title"
            aria-describedby="skip-all-desc"
            className="mt-4 animate-rise rounded-xl border border-line-strong bg-paper p-3.5 sm:flex sm:items-center sm:gap-4"
          >
            <div className="flex-1">
              <p id="skip-all-title" className="text-[15px] font-semibold text-ink">
                {skipTitle}
              </p>
              <p id="skip-all-desc" className="text-[14px] text-ink-2">
                {skipBody}
              </p>
            </div>
            <div className="mt-3 flex gap-2 sm:mt-0">
              <Button ref={keepRef} variant="secondary" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
              <Button variant="secondary" onClick={onSkipAll} className="border-ink-2/40">
                Yes, skip
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

interface FormFooterProps {
  answered: number;
  skipped: number;
  total: number;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel: string;
  /** Plain note under the counts, e.g. "2 unanswered will be skipped". */
  note?: string;
}

/** Sticks to the bottom of the screen so "Continue" is always one tap away on long forms. */
export function FormFooter({ answered, skipped, total, onBack, onContinue, continueLabel, note }: FormFooterProps) {
  const pct = total ? ((answered + skipped) / total) * 100 : 100;
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 sm:-mx-6 lg:mx-0">
      <div className="border-t border-line bg-paper/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-6 lg:mb-4 lg:rounded-2xl lg:border lg:bg-card/95 lg:px-5 lg:shadow-lift">
        <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <Button variant="quiet" onClick={onBack} className="-ml-2 px-3">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-[380px]:sr-only">Back</span>
            </Button>
          )}
          {/* Phones get the short form so the bar stays one row high. */}
          <p className="min-w-0 text-[13px] leading-tight text-ink-2" aria-live="polite">
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-ink">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span className="sm:hidden">
                {answered}/{total} done
              </span>
              <span className="max-sm:hidden">
                {answered} of {total} answered
              </span>
            </span>
            {skipped > 0 && <span className="whitespace-nowrap text-muted max-sm:hidden"> · {skipped} skipped</span>}
            {note && <span className="block text-muted max-sm:hidden">{note}</span>}
          </p>
          <Button onClick={onContinue} className="ml-auto shrink-0">
            {continueLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
