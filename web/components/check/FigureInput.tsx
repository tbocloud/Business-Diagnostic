'use client';

import clsx from 'clsx';
import { useEffect, useId, useState } from 'react';

export interface BlockFigure {
  /** The saved figure, or undefined when none (empty, out of range, or a quick choice picked). */
  value: number | undefined;
  /** A valid figure, or undefined when the box is empty or the number is out of range. */
  onChange: (value: number | undefined, typed: string) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  unit: string;
  placeholder?: string;
  label: string;
}

/** "15,000", "₹ 4.5", "40%" → number; anything else → undefined. */
export function parseFigure(text: string): number | undefined {
  const cleaned = text.replace(/[\s,₹%]/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** The box for a number question: "₹ [ 15000 ] a month". Commas, ₹ and % are fine to type. */
export function FigureInput({ value, onChange, min, max, step = 1, prefix, unit, placeholder, label }: BlockFigure) {
  const id = useId();
  const hintId = useId();
  const [text, setText] = useState(value === undefined ? '' : String(value));

  // Follow changes from outside (picking "Not sure" clears the figure), but never rewrite what the
  // client is in the middle of typing ("4." while they type "4.5") — nor a number we refused
  // ourselves (out of range), which clears the saved figure but must stay in the box with its hint.
  useEffect(() => {
    setText((current) => {
      const n = parseFigure(current);
      if (n === value) return current;
      if (value === undefined && current.trim() !== '' && (n === undefined || n < min || n > max)) return current;
      return value === undefined ? '' : String(value);
    });
  }, [value, min, max]);

  const typed = parseFigure(text);
  const outOfRange = text.trim() !== '' && (typed === undefined || typed < min || typed > max);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div
          className={clsx(
            'flex items-center rounded-xl border bg-card px-3.5 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
            outOfRange ? 'border-warn' : value !== undefined ? 'border-brand' : 'border-line-strong hover:border-ink-2/50',
          )}
        >
          {prefix && (
            <span className="mr-1.5 text-[16px] font-semibold text-ink-2" aria-hidden="true">
              {prefix}
            </span>
          )}
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            id={id}
            type="text"
            inputMode={step < 1 || min < 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            value={text}
            placeholder={placeholder}
            aria-invalid={outOfRange || undefined}
            aria-describedby={outOfRange ? hintId : undefined}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);
              const n = parseFigure(next);
              onChange(n !== undefined && n >= min && n <= max ? n : undefined, next);
            }}
            className="w-32 bg-transparent py-2.5 text-[16px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/80"
          />
        </div>
        <span className="text-[14px] text-ink-2">{unit}</span>
      </div>
      {outOfRange && (
        <p id={hintId} role="status" className="mt-1.5 text-[12.5px] text-warn-ink">
          Type a number between {min.toLocaleString('en-IN')} and {max.toLocaleString('en-IN')}.
        </p>
      )}
    </div>
  );
}
