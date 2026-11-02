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
