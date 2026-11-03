'use client';

import clsx from 'clsx';
import { Check, RotateCcw, SkipForward } from 'lucide-react';
import { useId, useState } from 'react';
import { ChoiceCard, onGroupKeyDown } from './ChoiceCard';
import { OtherPanel } from './OtherPanel';

export interface BlockOption {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  disabled?: boolean;
}

export interface BlockOther {
  open: boolean;
  value: string;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}

interface ChoiceBlockProps {
  /** Shown in the round badge until answered. */
  number: number;
  title: string;
  hint?: React.ReactNode;
  /** Small tag before the hint, e.g. "Pick all that apply". */
  tag?: string;
  kind: 'radio' | 'checkbox';
  options: BlockOption[];
  /** Ids currently chosen. For radio, ignored while "Other" is open. */
  selected: string[];
  onToggle: (id: string) => void;
  layout?: 'row' | 'tile' | 'pill';
  /** Extra grid classes for the options, e.g. 'sm:grid-cols-2'. */
  gridClassName?: string;
  /** "Other — type your own". Omit to hide it. */
  other?: BlockOther;
  answered: boolean;
  skipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
}

/**
 * One question inside a section form: number badge, question, options, "Other — type your own",
 * and its own Skip. A skipped question collapses to one line with "Answer it" to bring it back.
 */
export function ChoiceBlock({
  number,
  title,
  hint,
  tag,
  kind,
  options,
  selected,
  onToggle,
  layout = 'pill',
  gridClassName,
  other,
  answered,
  skipped,
  onSkip,
  onUnskip,
}: ChoiceBlockProps) {
  const headingId = useId();
  // Focus the "Other" box only when the client opens it, not when a saved answer re-renders it open.
  const [focusOther, setFocusOther] = useState(false);
  const otherIndex = options.length;
  const radioOtherOpen = kind === 'radio' && !!other?.open;
  const checkedIndex = radioOtherOpen ? otherIndex : options.findIndex((o) => selected.includes(o.id));
  const focusIndex = Math.max(0, checkedIndex);
  const done = answered && !skipped;

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        'scroll-mt-28 rounded-[18px] border px-4 py-4 transition-colors duration-200 sm:px-5 sm:py-5',
        skipped ? 'border-dashed border-line-strong bg-paper-deep/40' : 'border-line bg-card shadow-card',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={clsx(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[12px] font-semibold transition-colors',
            done && 'bg-brand text-white',
            skipped && 'border border-line-strong text-muted',
            !done && !skipped && 'border border-line-strong bg-paper text-ink-2',
          )}
        >
          {done ? (
            <Check className="h-3.5 w-3.5 animate-badge-pop" strokeWidth={3} />
          ) : skipped ? (
            <SkipForward className="h-3 w-3" />
          ) : (
            number
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className={clsx(
              'font-display text-balance pt-0.5 text-[16px] font-medium leading-snug sm:text-[17px]',
              skipped ? 'text-muted' : 'text-ink',
            )}
          >
            {title}
          </h2>
          {!skipped && (hint || tag) && (
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {tag && (
                <span className="mr-2 inline-block rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                  {tag}
                </span>
              )}
              {hint}
            </p>
          )}
        </div>
        {!skipped && (
          <button
            type="button"
            onClick={onSkip}
            aria-label={`Skip this question: ${title}`}
            className="-mr-1.5 -mt-1 inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            Skip
            <SkipForward className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {skipped ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-10 text-[13px] text-ink-2">
          <span>Skipped — not counted in your score.</span>
          <button
            type="button"
            onClick={onUnskip}
            className="inline-flex min-h-[34px] items-center gap-1.5 font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Answer it
          </button>
        </div>
      ) : (
        <div
          role={kind === 'radio' ? 'radiogroup' : 'group'}
          aria-labelledby={headingId}
          onKeyDown={onGroupKeyDown}
          className={clsx('mt-3 grid gap-1.5 sm:pl-10', gridClassName)}
        >
          {options.map((o, i) => (
            <ChoiceCard
              key={o.id}
              kind={kind}
              layout={layout}
              index={i}
              label={o.label}
              hint={o.hint}
              icon={o.icon}
              disabled={o.disabled}
              checked={radioOtherOpen ? false : selected.includes(o.id)}
              tabIndex={kind === 'checkbox' ? 0 : focusIndex === i ? 0 : -1}
              onSelect={() => onToggle(o.id)}
            />
          ))}
          {other && (
            <div className="col-span-full">
              <ChoiceCard
                kind={kind}
                layout={layout === 'tile' ? 'pill' : layout}
                index={otherIndex}
                label="Other — type your own"
                icon="PenLine"
                checked={other.open}
                attached={other.open}
                tabIndex={kind === 'checkbox' ? 0 : focusIndex === otherIndex ? 0 : -1}
                onSelect={() => {
                  setFocusOther(!other.open);
                  other.onToggle();
                }}
              />
              {other.open && (
                <OtherPanel
                  value={other.value}
                  onChange={other.onChange}
                  placeholder={other.placeholder ?? 'Tell us in your own words…'}
                  label={other.label ?? `Your answer: ${title}`}
                  autoFocus={focusOther}
                  showButton={false}
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
