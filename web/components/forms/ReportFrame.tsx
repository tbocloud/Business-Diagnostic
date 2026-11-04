'use client';

import clsx from 'clsx';
import { CheckCircle2, Printer } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ApiError, publicApi } from '@/lib/api';

/** Page frame for the Stage 2 and ERP check reports. */
export function ReportFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-line bg-paper/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Home">
            <Logo compact />
          </Link>
          <Button variant="secondary" onClick={() => window.print()} className="ml-auto !min-h-[40px] !px-3 !text-[13.5px]">
            <Printer className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}

export function ReportTitle({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow flex items-center gap-2 text-brand">
        <span aria-hidden="true" className="h-px w-6 bg-accent" />
        {eyebrow}
      </p>
      <h1 className="font-display mt-3 text-balance text-[34px] font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-[46px]">{title}</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{lead}</p>
    </div>
  );
}

export function ReportSection({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="print-avoid-break mt-14 sm:mt-16">
      <p className="eyebrow flex items-center gap-2">
        <span aria-hidden="true" className="h-px w-6 bg-accent" />
        {eyebrow}
      </p>
      <h2 id={id} className="font-display mt-2 text-balance text-[26px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[30px]">
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export type Tone = 'good' | 'warn' | 'gap' | 'neutral';

const TONE: Record<Tone, string> = {
  good: 'text-ok-ink',
  warn: 'text-warn-ink',
  gap: 'text-risk-ink',
  neutral: 'text-brand',
};

/** One figure: label, the big number, one plain sentence. */
export function Tile({ icon, label, big, note, tone = 'neutral' }: { icon: string; label: string; big: string; note?: string; tone?: Tone }) {
  return (
    <li className="flex flex-col rounded-[18px] border border-line bg-card px-5 py-5 shadow-card print:shadow-none">
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <Icon name={icon} className={clsx('h-4 w-4 shrink-0', TONE[tone])} />
        {label}
      </p>
      <p className="font-display mt-2.5 text-[28px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[32px]">{big}</p>
      {note && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{note}</p>}
    </li>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">{children}</ul>;
}

export function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {notes.map((n) => (
        <li key={n} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-2">
          <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          {n}
        </li>
      ))}
    </ul>
  );
}

/** "Talk to us about this report": phone / email onto this check's record (and the CRM). */
export function CheckContact({ submissionId, token, title, body }: { submissionId?: number; token?: string; title: string; body: string }) {
  const base = useId();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  if (!submissionId || !token) return null;

  const save = async () => {
    if (!phone.trim() && !email.trim()) return setError('Add a phone number or an email.');
    setError(null);
    setState('saving');
    try {
      await publicApi.saveContact({ submissionId, token, phone: phone.trim() || undefined, email: email.trim() || undefined });
      setState('saved');
    } catch (e) {
      setState('idle');
      setError(e instanceof ApiError ? e.message : 'Couldn’t send that — please try again.');
    }
  };

  return (
    <section className="no-print mt-16 rounded-[22px] border border-brand/30 bg-brand-soft/40 px-5 py-6 sm:px-8 sm:py-8">
      <h2 className="font-display text-[24px] font-medium text-ink">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{body}</p>
      {state === 'saved' ? (
        <p role="status" className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-ok-ink">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Thank you — we’ll be in touch soon.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor={`${base}-p`} className="text-[13px] font-semibold text-ink">
              Phone (WhatsApp)
            </label>
            <input id={`${base}-p`} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field mt-1" placeholder="+91 98950 22334" />
          </div>
          <div>
            <label htmlFor={`${base}-e`} className="text-[13px] font-semibold text-ink">
              Email
            </label>
            <input id={`${base}-e`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" placeholder="you@business.com" />
          </div>
          <Button type="submit" disabled={state === 'saving'}>
            {state === 'saving' ? 'Sending…' : 'Call me back'}
          </Button>
          {error && (
            <p role="alert" className="text-[13px] text-risk-ink sm:col-span-3">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
