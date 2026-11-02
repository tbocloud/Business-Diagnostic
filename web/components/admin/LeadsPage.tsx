'use client';

import clsx from 'clsx';
import { CalendarClock, ChevronLeft, ChevronRight, Inbox, Loader2, MessageCircle, Phone, Search, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, ApiError, type LeadQuery, type LeadRow, type LeadsResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAdminUser } from './AdminShell';
import { Card, ErrorText, FollowUp, ScoreBadge, STATUSES, StatusPill, telHref, timeAgo, waHref } from './ui';

const FILTER_KEY = 'bhc-admin:lead-filters';

function loadFilters(): LeadQuery {
  try {
    return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}') as LeadQuery;
  } catch {
    return {};
  }
}

export function LeadsPage() {
  const user = useAdminUser();
  const [query, setQuery] = useState<LeadQuery>({ status: 'all', owner: 'all', sort: 'newest', page: 1 });
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  // Remember filters while the BDE hops between the list and a lead.
  useEffect(() => {
    const saved = loadFilters();
    setQuery((q) => ({ ...q, ...saved }));
    setSearch(saved.q ?? '');
    restored.current = true;
  }, []);

  // Debounce the search box.
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => setQuery((q) => (q.q === search ? q : { ...q, q: search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(query));
    } catch {
      /* private mode */
    }
    let live = true;
    setLoading(true);
    adminApi
      .leads(query)
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(null);
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Could not load leads'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [query]);

  const set = (patch: LeadQuery) => setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const activeUsers = useMemo(() => data?.users.filter((u) => u.active) ?? [], [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">Leads</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Every business that finished the health check{user.role === 'bde' ? ' — yours, plus new ones nobody has taken yet' : ''}.
          </p>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat Icon={Sparkles} label="New, not yet contacted" value={data?.stats.new} tone="accent" onClick={() => set({ status: 'new' })} />
        <Stat Icon={Inbox} label="Received this week" value={data?.stats.thisWeek} />
        <Stat
          Icon={CalendarClock}
          label="Follow-ups due"
          value={data?.stats.followUpsDue}
          tone={data && data.stats.followUpsDue > 0 ? 'risk' : undefined}
          onClick={() => set({ sort: 'followup', status: 'all' })}
        />
        <Stat Icon={Trophy} label="Won" value={data?.stats.won} hint={data?.stats.avgScore != null ? `Avg. score ${data.stats.avgScore}` : undefined} />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-[22rem]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search leads"
            placeholder="Search business, name, phone or email"
            className="field !pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Segmented
            label="Owner"
            value={query.owner ?? 'all'}
            onChange={(owner) => set({ owner })}
            options={[
              { id: 'all', label: user.role === 'admin' ? 'Everyone' : 'All I can see' },
              { id: 'mine', label: 'Mine' },
              { id: 'unassigned', label: 'Unassigned' },
            ]}
          />
          {user.role === 'admin' && activeUsers.length > 0 && (
            <select
              aria-label="Filter by team member"
              className="field !w-auto !py-2 text-[14px]"
              value={/^\d+$/.test(query.owner ?? '') ? query.owner : ''}
              onChange={(e) => set({ owner: e.target.value || 'all' })}
            >
              <option value="">Any team member</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          <select aria-label="Sort" className="field !w-auto !py-2 text-[14px]" value={query.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="followup">Follow-up date</option>
            <option value="score_low">Lowest score first</option>
            <option value="score_high">Highest score first</option>
          </select>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Status">
        {[{ id: 'all', label: 'All', dot: '' }, ...STATUSES].map((s) => {
          const active = (query.status ?? 'all') === s.id;
          const n = data?.counts[s.id as keyof LeadsResponse['counts']];
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => set({ status: s.id })}
              className={clsx(
                'inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors',
                active ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink',
              )}
            >
              {s.dot && <span className={clsx('h-2 w-2 rounded-full', s.dot, active && 'ring-2 ring-white/60')} aria-hidden="true" />}
              {s.label}
              {n !== undefined && <span className={clsx('tabular-nums', active ? 'text-white/80' : 'text-muted')}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <ErrorText>{error}</ErrorText>
        {loading && !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading leads" />
          </div>
        ) : data && data.leads.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-semibold text-ink">No leads here</p>
            <p className="mt-1 text-[14px] text-ink-2">
              {query.q || query.status !== 'all' || query.owner !== 'all'
                ? 'Try clearing the search or filters.'
                : 'When a business finishes the health check, it appears here.'}
            </p>
          </Card>
        ) : data ? (
          <div className={clsx('transition-opacity', loading && 'opacity-60')}>
            <LeadTable leads={data.leads} />
            <LeadCards leads={data.leads} />
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-2">
                  Page {data.page} of {pages} · {data.total} leads
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={data.page <= 1} onClick={() => set({ page: data.page - 1 })}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button variant="secondary" disabled={data.page >= pages} onClick={() => set({ page: data.page + 1 })}>
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const leadHref = (id: number) => `/admin/lead/?id=${id}`;

function LeadTable({ leads }: { leads: LeadRow[] }) {
  return (
    <Card className="hidden overflow-hidden md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line bg-paper-deep/40 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            <th className="px-4 py-3">Business</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">Real gap</th>
            <th className="px-3 py-3">Contact</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Owner</th>
            <th className="px-3 py-3">Follow-up</th>
            <th className="px-4 py-3 text-right">Received</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="group relative border-b border-line last:border-0 hover:bg-paper-deep/40">
              <td className="px-4 py-3">
                {/* The whole row opens the lead; the name link carries it for keyboard and screen readers. */}
                <Link href={leadHref(l.id)} className="font-semibold text-ink after:absolute after:inset-0 hover:text-brand">
                  {l.company || 'Unnamed business'}
                </Link>
                <span className="block text-[12.5px] text-muted">
                  {[l.industry, l.stage].filter(Boolean).join(' · ') || '—'}
                  {l.source === 'legacy' && <span className="ml-1.5 rounded bg-paper-deep px-1.5 py-px text-[11px] font-semibold">Old form</span>}
                </span>
              </td>
              <td className="px-3 py-3">
                <ScoreBadge score={l.score} />
              </td>
              <td className="max-w-[12rem] px-3 py-3 text-[13.5px] text-ink-2">{l.realGap ?? '—'}</td>
              <td className="relative z-10 px-3 py-3">
                <ContactBits lead={l} />
              </td>
              <td className="px-3 py-3">
                <StatusPill status={l.status} />
              </td>
              <td className="px-3 py-3 text-[13.5px] text-ink-2">{l.assignedName ?? <span className="text-muted">Unassigned</span>}</td>
              <td className="px-3 py-3">
                <FollowUp date={l.followUpOn} status={l.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] text-muted">{timeAgo(l.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function LeadCards({ leads }: { leads: LeadRow[] }) {
  return (
    <ul className="grid gap-2.5 md:hidden">
      {leads.map((l) => (
        <li key={l.id}>
          <Card className="relative px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={leadHref(l.id)} className="font-semibold text-ink after:absolute after:inset-0">
                  {l.company || 'Unnamed business'}
                </Link>
                <span className="block truncate text-[12.5px] text-muted">{[l.industry, l.stage].filter(Boolean).join(' · ') || '—'}</span>
              </div>
              <ScoreBadge score={l.score} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusPill status={l.status} />
              <FollowUp date={l.followUpOn} status={l.status} />
              <span className="ml-auto text-[12px] text-muted">{timeAgo(l.createdAt)}</span>
            </div>
            {l.realGap && <p className="mt-2 text-[13px] text-ink-2">Real gap: {l.realGap}</p>}
            <div className="relative z-10 mt-2">
              <ContactBits lead={l} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function ContactBits({ lead }: { lead: LeadRow }) {
  if (!lead.phone && !lead.email) return <span className="text-[13px] text-muted">No contact yet</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {lead.phone && (
        <>
          <a href={telHref(lead.phone)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[13px] font-medium text-ink hover:bg-ink/[0.05]">
            <Phone className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            {lead.phone}
          </a>
          <a
            href={waHref(lead.phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${lead.contactName ?? lead.company ?? ''}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-ok-ink hover:bg-ok-soft"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </a>
        </>
      )}
      {!lead.phone && lead.email && (
        <a href={`mailto:${lead.email}`} className="text-[13px] font-medium text-brand underline-offset-2 hover:underline">
          {lead.email}
        </a>
      )}
    </span>
  );
}

function Stat({
  Icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  Icon: typeof Inbox;
  label: string;
  value: number | undefined;
  hint?: string;
  tone?: 'accent' | 'risk';
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <Icon className={clsx('h-4 w-4', tone === 'risk' ? 'text-risk-ink' : tone === 'accent' ? 'text-accent-ink' : 'text-brand')} aria-hidden="true" />
        {label}
      </span>
      <span className="font-display mt-1.5 block text-[30px] font-medium leading-none text-ink tabular-nums">{value ?? '–'}</span>
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </>
  );
  const cls = 'flex w-full flex-col items-start justify-start rounded-[18px] border border-line bg-card px-4 py-3.5 text-left shadow-card';
  return onClick ? (
    <button type="button" onClick={onClick} className={clsx(cls, 'transition-colors hover:border-line-strong')}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={clsx(
            'min-h-[36px] rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors',
            value === o.id ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
