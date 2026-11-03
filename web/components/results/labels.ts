import { CalendarClock, CalendarDays, Zap, type LucideIcon } from 'lucide-react';
import { GOALS } from '@/lib/profile';
import type { Effort, Profile } from '@/lib/types';

export const EFFORT_META: Record<Effort, { label: string; Icon: LucideIcon; className: string }> = {
  quick: { label: 'Quick win', Icon: Zap, className: 'bg-accent-soft text-accent-ink' },
  medium: { label: '30 days', Icon: CalendarDays, className: 'bg-paper-deep text-ink-2' },
  big: { label: '90 days', Icon: CalendarClock, className: 'bg-paper-deep text-ink-2' },
};

export function goalLabels(profile: Profile): string[] {
  const labels = profile.goals.map((g) => GOALS.find((x) => x.id === g)?.label).filter((x): x is string => !!x);
  if (profile.goalsOther?.trim()) labels.push(profile.goalsOther.trim());
  return labels;
}

export function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'business'
  );
}

/** What profile labels say when the client skipped that question. */
export const NOT_SPECIFIED = 'Not specified';

/** "a growing business" · "an established business" · "a business like yours" (stage skipped). */
export function stagePhrase(levelLabel: string): string {
  if (!levelLabel || levelLabel === NOT_SPECIFIED) return 'a business like yours';
  const l = levelLabel.toLowerCase();
  return `${/^[aeiou]/.test(l) ? 'an' : 'a'} ${l} business`;
}

/** Industry · stage · team, leaving out anything the client skipped. */
export function profileLine(...labels: string[]): string {
  return labels.filter((l) => l && l !== NOT_SPECIFIED).join(' · ');
}

/** "Fixes 20 gaps · strengthens 15 more" — real gaps and "could be stronger" counted separately. */
export function serviceImpact(items: { kind: 'gap' | 'watch' }[], style: 'long' | 'short' = 'long'): string {
  const gaps = items.filter((i) => i.kind === 'gap').length;
  const watch = items.length - gaps;
  const g = `${gaps} ${gaps === 1 ? 'gap' : 'gaps'}`;
  if (style === 'short') return gaps ? `fixes ${g}` : `strengthens ${watch} ${watch === 1 ? 'area' : 'areas'}`;
  if (!gaps) return `Strengthens ${watch} ${watch === 1 ? 'thing' : 'things'} in your business`;
  return `Fixes ${g}${watch ? ` · strengthens ${watch} more` : ''}`;
}
