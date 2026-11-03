import clsx from 'clsx';
import { Icon } from '@/components/Icon';
import { BRAND } from '@/lib/brand';
import type { ServiceId } from '@/lib/types';

/** A small badge for one of our services: ERP · Digital Marketing · AI. */
export function ServiceChip({ id, tone = 'light', className }: { id: ServiceId; tone?: 'light' | 'dark'; className?: string }) {
  const s = BRAND.services[id];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold',
        tone === 'dark' ? 'bg-white/15 text-white' : 'border border-brand/25 bg-brand-soft/60 text-brand',
        className,
      )}
    >
      <Icon name={s.icon} className="h-3.5 w-3.5" />
      {s.name}
    </span>
  );
}
