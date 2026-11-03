import Link from 'next/link';
import clsx from 'clsx';
import { BRAND } from '@/lib/brand';

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={clsx('group inline-flex items-center gap-2.5 rounded-lg', className)}
      aria-label={`${BRAND.product} by ${BRAND.company} — home`}
    >
      <span
        aria-hidden="true"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand font-display text-[12px] font-semibold tracking-[0.06em] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]"
      >
        {BRAND.mark}
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-accent" />
      </span>
      <span className={clsx('flex flex-col leading-none', compact && 'max-sm:sr-only')}>
        <span className="text-[15px] font-semibold tracking-tight text-ink">{BRAND.product}</span>
        <span className="mt-1 text-[11.5px] font-medium text-muted">by {BRAND.company}</span>
      </span>
    </Link>
  );
}
