'use client';

import clsx from 'clsx';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  Presentation,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { adminApi, ApiError, type LeadDetail, type LeadNote, type LeadStatus } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { computeResults } from '@/lib/engine';
import { normalizeReport } from '@/lib/normalize';
import { encodeResults } from '@/lib/share';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ReportBody } from '@/components/results/ReportBody';
import { useAdminUser } from './AdminShell';
import { Card, dayFromNow, ErrorText, FieldLabel, formatDate, ScoreBadge, STATUSES, StatusPill, telHref, timeAgo, waHref } from './ui';

export function LeadPage({ id }: { id: number }) {
  const [data, setData] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .lead(id)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this lead'));
  }, [id]);

  useEffect(() => {
    if (id > 0) load();
    else setError('No lead selected');
  }, [id, load]);

  if (error && !data) {
    return (
      <div>
        <BackLink />
        <Card className="mt-4 px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-ink">{error}</p>
        </Card>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading lead" />
      </div>
    );
  }
  return <LeadView data={data} onChange={setData} />;
}

function BackLink() {
  return (
    <Link href="/admin/" className="inline-flex min-h-[36px] items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      All leads
    </Link>
  );
}

function LeadView({ data, onChange }: { data: LeadDetail; onChange: (d: LeadDetail) => void }) {
  const { lead, legacy } = data;
  // Stored answers came from the public submit endpoint — clean them before scoring.
  const report = useMemo(() => (data.report ? normalizeReport(data.report.profile, data.report.answers) : null), [data.report]);
  const results = useMemo(() => (report ? computeResults(report.profile, report.answers) : null), [report]);
  const hash = useMemo(() => (report ? `#r=${encodeResults(report.profile, report.answers)}` : ''), [report]);
  const name = lead.company || 'Unnamed business';
  const waText = `Hi ${lead.contactName ?? ''}, this is ${BRAND.company} — thanks for completing the ${BRAND.product} for ${name}.`.replace('Hi ,', 'Hi,');

  return (
    <div>
      <BackLink />

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={lead.status} />
            {lead.source === 'legacy' && (
              <span className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">Submitted on the old form</span>
            )}
            <span className="text-[13px] text-muted">Received {formatDate(lead.createdAt)} · {timeAgo(lead.createdAt)}</span>
          </div>
          <h1 className="font-display mt-2 text-balance text-[28px] font-medium leading-tight text-ink sm:text-[36px]">{name}</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {[lead.industry, lead.stage, lead.team].filter(Boolean).join(' · ') || 'No business details given'}
          </p>
        </div>
        <ScoreBadge score={lead.score} band={lead.band} size="lg" />
      </div>

      {/* Contact quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {lead.phone && (
          <>
            <ButtonLink href={telHref(lead.phone)} variant="secondary">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call {lead.phone}
            </ButtonLink>
            <a
              href={waHref(lead.phone, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line-strong bg-card px-4 text-[15px] font-semibold text-ink hover:border-ink-2/60"
            >
              <MessageCircle className="h-4 w-4 text-ok-ink" aria-hidden="true" />
              WhatsApp
            </a>
          </>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}?subject=${encodeURIComponent(`${BRAND.product}: ${name}`)}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line-strong bg-card px-4 text-[15px] font-semibold text-ink hover:border-ink-2/60"
          >
            <Mail className="h-4 w-4 text-brand" aria-hidden="true" />
            Email
          </a>
        )}
        {!lead.phone && !lead.email && (
          <p className="rounded-xl bg-paper-deep px-3 py-2 text-[13.5px] text-ink-2">
            The client hasn’t left a phone or email yet — add them in “Contact” when you have them.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Side panel first on phones: the BDE's working area */}
        <aside className="order-first space-y-4 lg:order-last">
          <div className="space-y-4 lg:sticky lg:top-20">
            <PipelineCard data={data} onChange={onChange} />
            <ContactCard data={data} onChange={onChange} />
            <NotesCard data={data} onChange={onChange} />
          </div>
        </aside>

        <section aria-label="Client report" className="min-w-0">
          {results ? (
            <>
              <Card className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="mr-auto min-w-0">
                  <p className="text-[14px] font-semibold text-ink">The client’s report</p>
                  <p className="text-[13px] text-ink-2">Exactly what they saw. Present it to them with review mode — press N for your notes.</p>
                </div>
                <ButtonLink href={`/results/review/${hash}`} target="_blank" rel="noopener">
                  <Presentation className="h-4 w-4" aria-hidden="true" />
                  Start review
                </ButtonLink>
                <ButtonLink href={`/results/${hash}`} target="_blank" rel="noopener" variant="secondary">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open report
                </ButtonLink>
                <CopyLink url={() => `${window.location.origin}/results/${hash}`} />
              </Card>
              <ReportBody results={results} compact />
            </>
          ) : legacy ? (
            <LegacyReport legacy={legacy} />
          ) : (
            <Card className="px-6 py-10 text-center text-[14px] text-ink-2">No answers were stored for this lead.</Card>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Pipeline: status, owner, follow-up ──────────────────────

function PipelineCard({ data, onChange }: { data: LeadDetail; onChange: (d: LeadDetail) => void }) {
  const me = useAdminUser();
  const { lead } = data;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = { owner: useId(), date: useId() };

  const update = async (key: string, patch: Parameters<typeof adminApi.updateLead>[0]) => {
    setBusy(key);
    setError(null);
    try {
      onChange(await adminApi.updateLead(patch));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  const activeUsers = data.users.filter((u) => u.active);
  const mine = lead.assignedTo === me.id;

  return (
    <Card className="px-4 py-4 sm:px-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Where this lead is</h2>
      <div className="mt-3 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Status">
        {STATUSES.map((s) => {
          const active = lead.status === s.id;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={active}
              disabled={busy !== null}
              onClick={() => !active && void update('status', { id: lead.id, status: s.id as LeadStatus })}
              className={clsx(
                'flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-left text-[13.5px] font-semibold transition-colors',
                active ? 'border-brand bg-brand-soft/60 text-ink shadow-[inset_0_0_0_1px_rgb(var(--brand))]' : 'border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink',
              )}
            >
              <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', s.dot)} aria-hidden="true" />
              {s.label}
              {busy === 'status' && active && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <FieldLabel htmlFor={ids.owner}>Owner</FieldLabel>
        {me.role === 'admin' ? (
          <select
            id={ids.owner}
            className="field"
            value={lead.assignedTo ?? ''}
            disabled={busy !== null}
            onChange={(e) => void update('owner', { id: lead.id, assignedTo: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Unassigned</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.id === me.id ? ' (me)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <div id={ids.owner} className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[14px] text-ink">
              <UserRound className="h-4 w-4 text-brand" aria-hidden="true" />
              {lead.assignedName ?? 'Nobody yet'}
            </span>
            {lead.assignedTo === null && (
              <Button className="ml-auto" disabled={busy !== null} onClick={() => void update('owner', { id: lead.id, assignedTo: me.id })}>
                Take this lead
              </Button>
            )}
            {mine && (
              <Button variant="quiet" className="ml-auto" disabled={busy !== null} onClick={() => void update('owner', { id: lead.id, assignedTo: null })}>
                Hand back
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <FieldLabel htmlFor={ids.date}>Next follow-up</FieldLabel>
        <input
          id={ids.date}
          type="date"
          className="field"
          value={lead.followUpOn ?? ''}
          disabled={busy !== null}
          onChange={(e) => void update('followup', { id: lead.id, followUpOn: e.target.value || null })}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'Tomorrow', days: 1 },
            { label: 'In 3 days', days: 3 },
            { label: 'Next week', days: 7 },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={busy !== null}
              onClick={() => void update('followup', { id: lead.id, followUpOn: dayFromNow(q.days) })}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-line-strong hover:text-ink"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {q.label}
            </button>
          ))}
          {lead.followUpOn && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void update('followup', { id: lead.id, followUpOn: null })}
              className="min-h-[32px] rounded-full px-2.5 text-[12.5px] font-semibold text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  );
}

// ── Contact ─────────────────────────────────────────────────

function ContactCard({ data, onChange }: { data: LeadDetail; onChange: (d: LeadDetail) => void }) {
  const { lead } = data;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: lead.contactName ?? '', phone: lead.phone ?? '', email: lead.email ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { name: useId(), phone: useId(), email: useId() };

  useEffect(() => setForm({ name: lead.contactName ?? '', phone: lead.phone ?? '', email: lead.email ?? '' }), [lead.contactName, lead.phone, lead.email]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onChange(await adminApi.updateLead({ id: lead.id, contact: form }));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Contact</h2>
        {!editing && (
          <Button variant="quiet" className="-mr-2 !min-h-[32px] !px-2 !text-[13px]" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} className="mt-2 grid gap-2.5">
          <div>
            <FieldLabel htmlFor={ids.name}>Name</FieldLabel>
            <input id={ids.name} className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor={ids.phone}>Phone / WhatsApp</FieldLabel>
            <input id={ids.phone} className="field" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor={ids.email}>Email</FieldLabel>
            <input id={ids.email} className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save
            </Button>
            <Button variant="quiet" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="mt-2 grid gap-1.5 text-[14px]">
          <Row label="Name" value={lead.contactName} />
          <Row label="Phone" value={lead.phone} />
          <Row label="Email" value={lead.email} />
          {lead.headache && <Row label="Said their headache is" value={`“${lead.headache}”`} />}
        </dl>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[5.5rem] shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

// ── Notes & history ─────────────────────────────────────────

const NOTE_ICON: Record<LeadNote['kind'], typeof History> = {
  note: MessageSquareText,
  status: Check,
  assign: UserRound,
  followup: CalendarClock,
  contact: Phone,
  system: History,
};

function NotesCard({ data, onChange }: { data: LeadDetail; onChange: (d: LeadDetail) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !text.trim()) return; // Ctrl/Cmd+Enter bypasses the disabled button
    setBusy(true);
    setError(null);
    try {
      const { notes } = await adminApi.addNote(data.lead.id, text.trim());
      onChange({ ...data, notes });
      setText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="px-4 py-4 sm:px-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Notes & history</h2>
      <form onSubmit={add} className="mt-3">
        <label htmlFor={noteId} className="sr-only">
          Add a note
        </label>
        <textarea
          id={noteId}
          rows={2}
          className="field min-h-[68px] resize-y"
          placeholder="What happened? e.g. Called — meeting Tuesday 11am"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void add(e);
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted">Only your team sees notes.</span>
          <Button type="submit" disabled={busy || !text.trim()} className="!min-h-[36px] !px-3 !text-[13.5px]">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Add note
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
      <ol className="mt-4 space-y-3 border-t border-line pt-4">
        {data.notes.map((n) => {
          const Icon = NOTE_ICON[n.kind] ?? History;
          const isNote = n.kind === 'note';
          return (
            <li key={n.id} className="flex gap-2.5">
              <span
                className={clsx(
                  'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
                  isNote ? 'bg-brand text-white' : 'bg-paper-deep text-ink-2',
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={clsx('whitespace-pre-wrap break-words text-[13.5px] leading-snug', isNote ? 'text-ink' : 'text-ink-2')}>{n.body}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {n.author ?? (n.kind === 'system' ? 'Client' : 'System')} · {timeAgo(n.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
        {data.notes.length === 0 && <li className="text-[13.5px] text-muted">Nothing yet.</li>}
      </ol>
    </Card>
  );
}

// ── Old-form (GPT) submissions ──────────────────────────────

function LegacyReport({ legacy }: { legacy: NonNullable<LeadDetail['legacy']> }) {
  const analysis = legacy.analysis && typeof legacy.analysis === 'object' ? (legacy.analysis as Record<string, unknown>) : null;
  const answers = legacy.answers && typeof legacy.answers === 'object' ? (legacy.answers as Record<string, unknown>) : null;
  return (
    <div className="space-y-4">
      <Card className="px-5 py-5">
        <h2 className="font-display text-[20px] font-medium text-ink">Scores from the old form</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">This business used the earlier five-area check, so there’s no new-style report or review mode.</p>
        <ul className="mt-4 grid gap-2.5">
          {Object.entries(legacy.scores).map(([label, v]) => (
            <li key={label} className="grid grid-cols-[9rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-[14px]">
              <span className="text-ink-2">{label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-data-track">
                <span className="block h-full rounded-full bg-data" style={{ width: `${v ?? 0}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-ink">{v ?? '—'}</span>
            </li>
          ))}
        </ul>
      </Card>
      {analysis && (
        <Card className="px-5 py-5">
          <h2 className="font-display text-[20px] font-medium text-ink">AI analysis (old form)</h2>
          <KeyValues data={analysis} />
        </Card>
      )}
      {answers && (
        <Card className="px-5 py-5">
          <h2 className="font-display text-[20px] font-medium text-ink">Their answers</h2>
          <KeyValues data={answers} />
        </Card>
      )}
    </div>
  );
}

function KeyValues({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="mt-3 grid gap-3">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{k.replace(/([a-z])([A-Z])/g, '$1 $2')}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap break-words text-[14px] text-ink">{render(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function render(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('\n• ').replace(/^/, '• ');
  return JSON.stringify(v, null, 2);
}

function CopyLink({ url }: { url: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url());
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-ok-ink" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}
