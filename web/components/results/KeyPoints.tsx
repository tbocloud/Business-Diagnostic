import clsx from 'clsx';
import { Icon } from '@/components/Icon';
import type { KeyPoint, SectionResult } from '@/lib/types';
import { bigScale, countWord, KeyPointChip, kpStyle } from './keyPointMeta';
import { SectionHeader } from './SectionHeader';

const BIG_CLASS = {
  xl: 'text-[44px] leading-none tracking-[-0.025em] print:text-[32px]',
  lg: 'text-[27px] leading-[1.1] tracking-[-0.015em] print:text-[21px]',
  md: 'text-[20px] leading-[1.25] tracking-[-0.005em] print:text-[16px]',
};

function KeyPointCard({ point, n, sections }: { point: KeyPoint; n: number; sections: SectionResult[] }) {
  const style = kpStyle(point);
  return (
    <li className="print-avoid-break print-plain relative flex flex-col overflow-hidden rounded-[22px] border border-line bg-card p-5 shadow-card sm:p-6 print:rounded-2xl print:p-4">
      <span aria-hidden="true" className={clsx('absolute inset-x-0 top-0 h-1', style.bar)} />
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="font-display text-[14px] font-medium tabular-nums text-muted">
            {String(n).padStart(2, '0')}
          </span>
          <span aria-hidden="true" className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-lg', style.chip)}>
            <Icon name={point.icon} className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="truncate text-[13px] font-semibold text-ink-2">{point.label}</span>
        </p>
        <KeyPointChip point={point} sections={sections} />
      </div>
      <p className={clsx('font-display mt-4 font-medium text-ink', BIG_CLASS[bigScale(point.big)])}>{point.big}</p>
      <p className="mt-3 text-[15px] font-semibold leading-snug text-ink print:mt-2 print:text-[13px]">{point.headline}</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2 print:text-[12px] print:leading-snug">{point.detail}</p>
    </li>
  );
}

/** Owner-facing headline cards (3–6 of them). Presenter notes (`talk`, `ask`) never appear here. */
export function KeyPoints({ points, sections }: { points: KeyPoint[]; sections: SectionResult[] }) {
  if (!points.length) return null;
  return (
    <section aria-labelledby="key-points-title">
      <SectionHeader
        id="key-points-title"
        eyebrow="At a glance"
        title="Key points at a glance"
        lead={`The ${countWord(points.length)} things worth knowing from your check-up — in the order we’d talk them through.`}
      />
      <ol
        className={clsx(
          'grid gap-3 md:grid-cols-2 lg:gap-4 print:grid-cols-3 print:gap-2.5',
          points.length % 3 === 0 || points.length > 4 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        )}
      >
        {points.map((p, i) => (
          <KeyPointCard key={p.id} point={p} n={i + 1} sections={sections} />
        ))}
      </ol>
    </section>
  );
}
