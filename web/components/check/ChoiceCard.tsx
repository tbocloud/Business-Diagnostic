'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';

export const letterFor = (i: number) => String.fromCharCode(65 + i);

interface ChoiceCardProps {
  kind: 'radio' | 'checkbox';
  checked: boolean;
  index: number;
  label: string;
  hint?: string;
  icon?: string;
  layout?: 'row' | 'tile' | 'pill';
  disabled?: boolean;
  /** Visually attached to an expanding panel below (for "Other"). */
  attached?: boolean;
  tabIndex?: number;
  onSelect: () => void;
}

/**
 * A tactile answer card: letter badge (A, B, C…) that turns into a check when chosen,
 * a little "press" when selected, and a ≥ 44px touch target in every layout.
 */
export const ChoiceCard = forwardRef<HTMLButtonElement, ChoiceCardProps>(function ChoiceCard(
  { kind, checked, index, label, hint, icon, layout = 'row', disabled, attached, tabIndex, onSelect },
  ref,
) {
  const [popping, setPopping] = useState(false);
  const was = useRef(checked);
  useEffect(() => {
    if (checked && !was.current) setPopping(true);
    was.current = checked;
  }, [checked]);

  const badge = (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center border font-display text-[11.5px] font-semibold transition-colors duration-150',
        kind === 'radio' ? 'h-6 w-6 rounded-full' : 'h-6 w-6 rounded-[7px]',
        checked
          ? 'border-brand bg-brand text-white'
          : 'border-line-strong bg-paper text-ink-2 group-hover:border-ink-2/50 group-hover:text-ink',
      )}
    >
      {checked ? (
        <Check key="c" className="h-3.5 w-3.5 animate-badge-pop" strokeWidth={3} />
      ) : (
        <span key="l">{letterFor(index)}</span>
      )}
    </span>
  );

  return (
    <button
      ref={ref}
      type="button"
      role={kind}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={tabIndex}
      data-choice=""
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onAnimationEnd={() => setPopping(false)}
      className={clsx(
        'group relative w-full text-left outline-offset-2 transition-[border-color,background-color,box-shadow,transform] duration-150',
        'border bg-card',
        checked
          ? 'border-brand bg-brand-soft/50 shadow-[inset_0_0_0_1px_rgb(var(--brand))]'
          : 'border-line hover:-translate-y-px hover:border-line-strong hover:shadow-lift',
        disabled && !checked && 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:border-line hover:shadow-none',
        popping && 'animate-pop',
        layout === 'row' && 'flex min-h-[46px] items-center gap-3 px-3.5 py-2',
        layout === 'tile' && 'flex min-h-[52px] items-center gap-2.5 px-3 py-2 sm:min-h-[92px] sm:flex-col sm:items-start sm:justify-between sm:gap-2 sm:p-3',
        layout === 'pill' && 'flex min-h-[44px] items-center gap-2.5 px-3.5 py-2',
        attached ? 'rounded-t-xl' : 'rounded-xl',
      )}
    >
      {layout === 'tile' ? (
        <>
          <span className="flex w-full items-center justify-between gap-3 max-sm:w-auto">
            <span
              aria-hidden="true"
              className={clsx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                checked ? 'bg-brand text-white' : 'bg-paper-deep text-brand',
              )}
            >
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <span className="max-sm:hidden">{badge}</span>
          </span>
          <span className="min-w-0 flex-1 sm:flex-none">
            <span className="block text-[13.5px] font-semibold leading-snug text-ink">{label}</span>
            {hint && <span className="mt-0.5 block text-[12px] leading-snug text-muted">{hint}</span>}
          </span>
          <span className="sm:hidden">{badge}</span>
        </>
      ) : (
        <>
          {badge}
          {icon && (
            <Icon
              name={icon}
              className={clsx('h-4 w-4 shrink-0 transition-colors', checked ? 'text-brand' : 'text-ink-2/70')}
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium leading-snug text-ink md:text-[14.5px]">{label}</span>
            {hint && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{hint}</span>}
          </span>
        </>
      )}
    </button>
  );
});

/**
 * Arrow-key navigation between cards in a group (roving focus for radio groups).
 * Selection still needs Space/Enter or a letter key, because choosing a single answer moves on.
 */
export function onGroupKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-choice]'));
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  e.preventDefault();
  let next = current;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (current + 1) % items.length;
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = items.length - 1;
  items[next]?.focus();
}
