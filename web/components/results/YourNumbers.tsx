import clsx from 'clsx';
import { Icon } from '@/components/Icon';
import type { NumberFact } from '@/lib/types';
import { SectionHeader } from './SectionHeader';

const TONE: Record<NumberFact['tone'], { chip: string; icon: string; label: string }> = {
  good: { chip: 'bg-ok-soft text-ok-ink', icon: 'text-ok-ink', label: 'Looking good' },
  warn: { chip: 'bg-warn-soft text-warn-ink', icon: 'text-warn-ink', label: 'Worth a look' },
  gap: { chip: 'bg-risk-soft text-risk-ink', icon: 'text-risk-ink', label: 'Costing you' },
  neutral: { chip: 'bg-paper-deep text-ink-2', icon: 'text-brand', label: 'For reference' },
};

/** "Your numbers": the client's own figures, with the maths that makes each one mean something. */
export function YourNumbers({ facts }: { facts: NumberFact[] }) {
  if (facts.length === 0) return null;
  return (
    <section aria-labelledby="your-numbers" className="print-avoid-break">
      <SectionHeader
        id="your-numbers"
        eyebrow="Your numbers"
        title="What your figures add up to"
        lead="Worked out from the numbers you gave us — rough figures are fine, the direction is what matters."
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {facts.map((f) => {
          const tone = TONE[f.tone];
          return (
            <li key={f.id} className="flex flex-col rounded-[18px] border border-line bg-card px-5 py-5 shadow-card print:shadow-none">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <Icon name={f.icon} className={clsx('h-4 w-4 shrink-0', tone.icon)} />
                  {f.label}
                </p>
                <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', tone.chip)}>{tone.label}</span>
              </div>
              <p className="font-display mt-2.5 text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[32px]">{f.big}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{f.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
