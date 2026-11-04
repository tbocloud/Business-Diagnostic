'use client';

import clsx from 'clsx';
import { ArrowRight, Check } from 'lucide-react';
import { CheckContact, ReportSection, ReportTitle, Tile, TileGrid } from '@/components/forms/ReportFrame';
import { ButtonLink } from '@/components/ui/Button';
import type { ErpResults } from '@/lib/erp';

export function ErpReport({
  results: r,
  businessName,
  own,
}: {
  results: ErpResults;
  businessName: string;
  own?: { submissionId?: number; token?: string };
}) {
  const nothing = r.need === null && r.phase1.length === 0 && r.fixes.length === 0;
  return (
    <>
      <ReportTitle
        eyebrow="ERP check"
        title={businessName || 'Your business'}
        lead="Whether an ERP would help now, which parts to start with, and what to prepare — from your answers."
      />

      {nothing && (
        <p className="mt-10 rounded-2xl border border-line bg-card px-5 py-6 text-[15px] text-ink-2">
          You skipped most of the questions this report is built from. Answer a few and it fills in.
        </p>
      )}

      {r.verdict && (
        <section
          aria-label="Our view"
          className={clsx(
            'print-avoid-break mt-10 rounded-[22px] border px-5 py-6 sm:px-8 sm:py-8',
            r.verdict.tone === 'good' && 'border-ok/30 bg-ok-soft',
            r.verdict.tone === 'warn' && 'border-warn/30 bg-warn-soft',
            r.verdict.tone === 'neutral' && 'border-line bg-card',
          )}
        >
          <p className="eyebrow text-ink-2">Our view</p>
          <h2 className="font-display mt-2 text-[28px] font-medium leading-tight text-ink sm:text-[34px]">{r.verdict.title}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{r.verdict.body}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {r.need !== null && <Meter label="How much an ERP would help" value={r.need} />}
            {r.readiness !== null && <Meter label="How ready you are to start" value={r.readiness} />}
          </div>
        </section>
      )}

      {r.fixes.length > 0 && (
        <ReportSection id="erp-fixes" eyebrow="What changes" title="What slows you down — and what an ERP changes">
          <ul className="grid gap-3 lg:grid-cols-2">
            {r.fixes.map((f) => (
              <li key={f.label} className="rounded-[18px] border border-line bg-card px-5 py-4 shadow-card">
                <p className="text-[14px] font-semibold text-risk-ink">{f.label}</p>
                <p className="mt-2 flex gap-2 text-[14.5px] leading-relaxed text-ink">
                  <ArrowRight className="mt-[3px] h-4 w-4 shrink-0 text-ok-ink" aria-hidden="true" />
                  {f.fix}
                </p>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {(r.phase1.length > 0 || r.phase2.length > 0) && (
        <ReportSection id="erp-modules" eyebrow="Modules" title="Where to start" lead="Start with the core, go live, then add the rest — a smaller first step goes live faster and with fewer surprises.">
          <div className="grid gap-3 md:grid-cols-2">
            <ModuleList title="Phase 1 — first to go live" items={[...r.phase1, ...(r.einvoice ? [`GST ${r.einvoice.toLowerCase()}`] : [])]} strong />
            {r.phase2.length > 0 && <ModuleList title="Phase 2 — once Phase 1 is running" items={r.phase2} />}
          </div>
        </ReportSection>
      )}

      {(r.size.users !== undefined || r.size.sites !== undefined || r.size.invoices !== undefined || r.size.items !== undefined) && (
        <ReportSection
          id="erp-size"
          eyebrow="Your setup"
          title={r.size.label ?? 'Your setup'}
          lead={r.size.weeks ? `Phase 1 usually takes ${r.size.weeks} for a business this size — a rough guide, confirmed after a demo on your own data.` : undefined}
        >
          <TileGrid>
            {r.size.users !== undefined && <Tile icon="Users" label="People using it" big={String(r.size.users)} />}
            {r.size.sites !== undefined && <Tile icon="Building2" label="Branches & sites" big={String(r.size.sites)} />}
            {r.size.invoices !== undefined && <Tile icon="FileStack" label="Invoices a month" big={r.size.invoices.toLocaleString('en-IN')} />}
            {r.size.items !== undefined && <Tile icon="Boxes" label="Items you sell" big={r.size.items.toLocaleString('en-IN')} />}
            {r.size.staff !== undefined && <Tile icon="UserRound" label="On payroll" big={String(r.size.staff)} />}
          </TileGrid>
          {r.today.length > 0 && (
            <p className="mt-4 text-[14.5px] text-ink-2">
              <strong className="font-semibold text-ink">Today you use:</strong> {r.today.join(' · ')}. Your data from these can be brought across.
            </p>
          )}
        </ReportSection>
      )}

      {r.prepare.length > 0 && r.need !== null && r.need >= 35 && (
        <ReportSection id="erp-prepare" eyebrow="Before you start" title="Get these ready">
          <ol className="space-y-2.5">
            {r.prepare.map((p, i) => (
              <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                <span className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </ReportSection>
      )}

      <section className="print-avoid-break mt-14 rounded-[22px] border border-line bg-card px-5 py-6 shadow-card sm:px-8">
        <p className="eyebrow text-brand">How Team Back Office helps</p>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink">
          We set up and support <strong className="font-semibold">ERPNext</strong> — accounts and GST, billing, stock, purchase, HR and payroll in one system,
          on the web and the phone. We move your data across from {r.today[0] ?? 'your current tools'}, train your team, and stay with you after go-live.
        </p>
      </section>

      {own && (
        <>
          <CheckContact
            submissionId={own.submissionId}
            token={own.token}
            title="See it working on your own data"
            body="Book a free demo: we show the Phase 1 modules with your own items and invoices — no obligation."
          />
          <div className="no-print mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/check" variant="secondary">
              Take the full Business Health Check
            </ButtonLink>
          </div>
        </>
      )}
    </>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const tone = value >= 65 ? 'bg-ok' : value >= 35 ? 'bg-warn' : 'bg-ink-2/40';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-medium text-ink-2">{label}</p>
        <p className="font-display text-[26px] font-medium text-ink">
          {value}
          <span className="text-[14px] text-muted">/100</span>
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${label}: ${value} out of 100`}>
        <div className={clsx('h-full rounded-full', tone)} style={{ width: `${Math.max(3, value)}%` }} />
      </div>
    </div>
  );
}

function ModuleList({ title, items, strong }: { title: string; items: string[]; strong?: boolean }) {
  return (
    <div className={clsx('rounded-[18px] border px-5 py-5', strong ? 'border-brand/40 bg-brand-soft/40' : 'border-line bg-card shadow-card')}>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((m) => (
          <li key={m} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px]', strong ? 'bg-brand text-white' : 'bg-paper-deep text-ink')}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
