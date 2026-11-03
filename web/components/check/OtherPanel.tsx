'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface OtherPanelProps {
  value: string;
  onChange: (v: string) => void;
  /** Called on the Continue button or Enter (without Shift). Omit to hide the button. */
  onContinue?: () => void;
  continueLabel?: string;
  /** Show the panel's own Continue button (Enter still continues when false). */
  showButton?: boolean;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

/** The panel that opens under "Other — type your own". */
export function OtherPanel({
  value,
  onChange,
  onContinue,
  continueLabel = 'Continue',
  showButton = true,
  placeholder = 'Type your answer in your own words…',
  label = 'Your answer',
  autoFocus = true,
  maxLength = 280,
}: OtherPanelProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: false });
  }, [autoFocus]);

  const ready = value.trim().length > 0;

  return (
    <div className="-mt-px animate-fade rounded-b-xl border border-t-0 border-brand bg-brand-soft/30 px-3.5 pb-3.5 pt-2.5 shadow-[inset_1px_0_0_rgb(var(--brand)),inset_-1px_0_0_rgb(var(--brand)),inset_0_-1px_0_rgb(var(--brand))]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={2}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && onContinue) {
            e.preventDefault();
            if (ready) onContinue();
          }
        }}
        className="field min-h-[76px] resize-y"
      />
      {onContinue && showButton && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted max-sm:hidden">Press Enter to continue</span>
          <Button onClick={onContinue} disabled={!ready} className="ml-auto">
            {continueLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
