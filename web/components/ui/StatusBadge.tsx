import clsx from 'clsx';
import { CircleAlert, CircleCheck, CircleMinus, CircleArrowUp, type LucideIcon } from 'lucide-react';
import type { SectionStatus } from '@/lib/types';

// Status colors are reserved for section status and always travel with an icon + a text label.
export const STATUS_META: Record<
  SectionStatus,
  { label: string; Icon: LucideIcon; chip: string; icon: string; fill: string }
> = {
  healthy: { label: 'Healthy', Icon: CircleCheck, chip: 'bg-ok-soft', icon: 'text-ok-ink', fill: 'bg-ok' },
  push: { label: 'Needs a push', Icon: CircleArrowUp, chip: 'bg-warn-soft', icon: 'text-warn-ink', fill: 'bg-warn' },
  priority: { label: 'Priority gap', Icon: CircleAlert, chip: 'bg-risk-soft', icon: 'text-risk-ink', fill: 'bg-risk' },
  'not-assessed': { label: 'Not assessed', Icon: CircleMinus, chip: 'bg-na-soft', icon: 'text-na-ink', fill: 'bg-na' },
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: {
  status: SectionStatus;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold text-ink',
        m.chip,
        size === 'sm' ? 'py-0.5 pl-1 pr-2 text-[12px]' : 'py-1 pl-1.5 pr-2.5 text-[13px]',
        className,
      )}
    >
      <m.Icon aria-hidden="true" className={clsx(m.icon, size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={2.25} />
      {label ?? m.label}
    </span>
  );
}
