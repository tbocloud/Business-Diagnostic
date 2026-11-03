'use client';

import clsx from 'clsx';
import type { LeadStatus } from '@/lib/api';

// ── Lead pipeline ───────────────────────────────────────────
// Pipeline colours are deliberately different from the report's Healthy / Needs a push /
// Priority gap colours, so a "Won" lead never reads as a "Healthy" score.

export const STATUSES: { id: LeadStatus; label: string; dot: string }[] = [
  { id: 'new', label: 'New', dot: 'bg-accent' },
  { id: 'contacted', label: 'Contacted', dot: 'bg-data' },
  { id: 'meeting', label: 'Meeting booked', dot: 'bg-brand' },
  { id: 'proposal', label: 'Proposal sent', dot: 'bg-ink-2' },
  { id: 'won', label: 'Won', dot: 'bg-ok' },
  { id: 'lost', label: 'Lost', dot: 'bg-line-strong' },
];
export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<LeadStatus, (typeof STATUSES)[number]>;

export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  const s = STATUS_BY_ID[status] ?? STATUS_BY_ID.new;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-card px-2.5 py-0.5 text-[12.5px] font-semibold text-ink',
        className,
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/** Score out of 100 with a plain word, coloured by the report's own bands. */
export function ScoreBadge({ score, band, size = 'md' }: { score: number | null; band?: string | null; size?: 'md' | 'lg' }) {
  if (score === null) return <span className="text-[13px] text-muted">—</span>;
  const tone = score >= 65 ? 'bg-ok-soft text-ok-ink' : score >= 50 ? 'bg-warn-soft text-warn-ink' : 'bg-risk-soft text-risk-ink';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={clsx(
          'grid place-items-center rounded-lg font-display font-semibold tabular-nums',
          tone,
          size === 'lg' ? 'h-12 min-w-[3rem] px-2 text-[22px]' : 'h-8 min-w-[2.25rem] px-1.5 text-[15px]',
        )}
      >
        {score}
      </span>
      {band && <span className="text-[12.5px] leading-tight text-ink-2">{band}</span>}
    </span>
  );
}

// ── Dates ───────────────────────────────────────────────────

export function formatDate(iso: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', opts);
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(iso);
}

/** 'YYYY-MM-DD' for today + n days (local time). */
export function dayFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'overdue' | 'today' | 'later' | null for a follow-up date. */
export function followUpState(date: string | null, status: LeadStatus): 'overdue' | 'today' | 'later' | null {
  if (!date || status === 'won' || status === 'lost') return null;
  const today = dayFromNow(0);
  return date < today ? 'overdue' : date === today ? 'today' : 'later';
}

export function FollowUp({ date, status }: { date: string | null; status: LeadStatus }) {
  const state = followUpState(date, status);
  if (!date) return <span className="text-[13px] text-muted">—</span>;
  return (
    <span
      className={clsx(
        'whitespace-nowrap text-[13px]',
        state === 'overdue' && 'font-semibold text-risk-ink',
        state === 'today' && 'font-semibold text-warn-ink',
        (state === 'later' || state === null) && 'text-ink-2',
      )}
    >
      {state === 'overdue' ? 'Overdue · ' : state === 'today' ? 'Today · ' : ''}
      {formatDate(date, { day: 'numeric', month: 'short' })}
    </span>
  );
}

// ── Contact links ───────────────────────────────────────────

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
export const waHref = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// ── Small building blocks ───────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-[18px] border border-line bg-card shadow-card', className)}>{children}</div>;
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-semibold text-ink">
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[13.5px] font-medium text-risk-ink">
      {children}
    </p>
  );
}
