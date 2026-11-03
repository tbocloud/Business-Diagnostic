import clsx from 'clsx';
import { Award, Crosshair, Lightbulb, Sprout, ThumbsUp, Zap, type LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { KeyPoint, SectionResult } from '@/lib/types';

// Key points have their OWN visual language — ink, teal, slate and saffron with their own
// icons — so they never borrow the reserved status colours (green / yellow / red) or icons.
// The one exception is a card that is literally about an area's status (the real gap):
// it shows that area's exact status badge, with the exact status words.
interface ToneStyle {
  label: string;
  Icon: LucideIcon;
  /** 4px top accent on dashboard cards. */
  bar: string;
  /** Chip and icon-tile colours (text colour included). */
  chip: string;
}

export const KP_TONE: Record<KeyPoint['tone'], ToneStyle> = {
  good: { label: 'On track', Icon: ThumbsUp, bar: 'bg-data', chip: 'bg-brand-soft text-brand' },
  neutral: { label: 'Worth knowing', Icon: Lightbulb, bar: 'bg-ink-2/45', chip: 'bg-paper-deep text-ink-2' },
  warn: { label: 'Room to grow', Icon: Sprout, bar: 'bg-ink-2', chip: 'bg-paper-deep text-ink' },
  gap: { label: 'Focus area', Icon: Crosshair, bar: 'bg-ink', chip: 'bg-ink text-white' },
  action: { label: 'Do this first', Icon: Zap, bar: 'bg-accent', chip: 'bg-accent-soft text-accent-ink' },
};

/** Tone style, with wording tuned to what the point is about. */
export function kpStyle(point: KeyPoint): ToneStyle {
  const base = KP_TONE[point.tone];
  if (point.id === 'strength') {
    return point.tone === 'good'
      ? { ...base, label: 'Strong point' }
      : { ...base, label: 'Strongest area', Icon: Award };
  }
  if (point.id === 'opportunity' && point.tone === 'neutral') return { ...base, label: 'Opportunity' };
  return base;
}

export function sectionFor(point: KeyPoint, sections: SectionResult[]): SectionResult | undefined {
  return point.section ? sections.find((s) => s.id === point.section) : undefined;
}

export function KeyPointChip({
  point,
  sections,
  size = 'sm',
}: {
  point: KeyPoint;
  sections: SectionResult[];
  size?: 'sm' | 'lg';
}) {
  const area = sectionFor(point, sections);
  if (point.id === 'realgap' && area) {
    return <StatusBadge status={area.status} size={size === 'lg' ? 'md' : 'sm'} className={size === 'lg' ? 'text-[15px]' : undefined} />;
  }
  const s = kpStyle(point);
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
        s.chip,
        size === 'sm' ? 'py-0.5 pl-1.5 pr-2 text-[12px]' : 'py-1.5 pl-2.5 pr-3.5 text-[15px]',
      )}
    >
      <s.Icon aria-hidden="true" strokeWidth={2.25} className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} />
      {s.label}
    </span>
  );
}

/** How long the eye-catcher is decides how big it can be. */
export function bigScale(text: string): 'xl' | 'lg' | 'md' {
  if (text.length <= 10) return 'xl';
  if (text.length <= 28) return 'lg';
  return 'md';
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
