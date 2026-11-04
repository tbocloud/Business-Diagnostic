'use client';

import clsx from 'clsx';
import { ArrowRight, Check, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { CheckContact, ReportSection, ReportTitle } from '@/components/forms/ReportFrame';
import { Gauge } from '@/components/results/Gauge';
import { ButtonLink } from '@/components/ui/Button';
import { type ErpArea, type ErpInsight, type ErpResults, ERP_TARGET, MODULES } from '@/lib/erp';

const STATUS: Record<NonNullable<ErpArea['status']>, { label: string; chip: string; bar: string }> = {
  good: { label: 'Working well', chip: 'bg-ok-soft text-ok-ink', bar: 'bg-ok' },
  push: { label: 'Worth fixing', chip: 'bg-warn-soft text-warn-ink', bar: 'bg-warn' },
  gap: { label: 'Big gap', chip: 'bg-risk-soft text-risk-ink', bar: 'bg-risk' },
};

export function ErpReport({
  results: r,
  businessName,
  own,
}: {
  results: ErpResults;
  businessName: string;
  own?: { submissionId?: number; token?: string };
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <ReportTitle
        eyebrow="ERP check"
        title={businessName || 'Your business'}
        lead="Where your current setup leaves gaps — area by area — and what ERPNext would fix first."
      />

      {r.overall === null ? (
        <p className="mt-10 rounded-2xl border border-line bg-card px-5 py-6 text-[15px] text-ink-2">
          You skipped the questions this report is built from. Answer a few in each area and it fills in.
        </p>
      ) : (
        <section
          aria-label="Your system health"
          className={clsx(
            'print-avoid-break mt-10 grid gap-8 rounded-[28px] border px-5 py-7 sm:px-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-12',
            r.verdict?.tone === 'good' && 'border-ok/30 bg-ok-soft/60',
            r.verdict?.tone === 'warn' && 'border-warn/30 bg-warn-soft/60',
            r.verdict?.tone === 'gap' && 'border-risk/25 bg-risk-soft/50',
          )}
        >
          <div className="mx-auto w-[220px] text-center">
            <p className="eyebrow text-ink-2">System health</p>
            <Gauge value={r.overall} target={ERP_TARGET} className="mt-2" />
          </div>
          <div>
            <h2 className="font-display text-balance text-[28px] font-medium leading-tight text-ink sm:text-[36px]">{r.verdict?.title}</h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">{r.verdict?.body}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              <li className="rounded-2xl bg-card px-4 py-3.5 shadow-card">
                <p className="text-[13px] font-medium text-ink-2">Gaps your setup leaves open</p>
                <p className="font-display mt-1 text-[30px] font-medium leading-none text-ink">{r.gapCount}</p>
              </li>
              {r.hours > 0 && (
                <li className="rounded-2xl bg-card px-4 py-3.5 shadow-card">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                    <Clock className="h-4 w-4 text-risk-ink" aria-hidden="true" />
                    Work an ERP would do for you
                  </p>
                  <p className="font-display mt-1 text-[30px] font-medium leading-none text-ink">
                    ≈ {r.hours} <span className="text-[15px] font-normal text-ink-2">hours a month</span>
                  </p>
                </li>
              )}
            </ul>
            {r.current?.note && (
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">On {r.current.label}:</strong> {r.current.note}
              </p>
            )}
          </div>
        </section>
      )}

      {r.areas.some((a) => a.score !== null) && (
        <ReportSection
          id="erp-areas"
          eyebrow="Area by area"
          title="Where your system works — and where it doesn’t"
          lead={`Each area is scored out of 100. Above ${ERP_TARGET} your setup is doing its job; below it, work is falling on people instead of the system.`}
        >
          <ul className="overflow-hidden rounded-[22px] border border-line bg-card shadow-card">
            {r.areas.map((a) => (
              <AreaRow key={a.id} area={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />
            ))}
          </ul>
        </ReportSection>
      )}

      {r.topGaps.length > 0 && (
        <ReportSection id="erp-gaps" eyebrow="The gaps costing you most" title="What ERPNext would fix first" lead="Your biggest gaps, worst first — what each one costs you, and how ERPNext closes it.">
          <ol className="space-y-3">
            {r.topGaps.map((g, i) => (
              <GapCard key={g.id} gap={g} n={i + 1} />
            ))}
          </ol>
        </ReportSection>
      )}

      {r.phase1.length > 0 && (
        <ReportSection
          id="erp-plan"
          eyebrow="Your ERPNext plan"
          title={r.size.label ?? 'Where to start'}
          lead={`Start with the modules that close your biggest gaps, go live, then add the rest.${r.size.weeks ? ` Phase 1 usually takes ${r.size.weeks} for a business this size — a rough guide, confirmed after a demo on your own data.` : ''}`}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ModuleList title="Phase 1 — first to go live" items={r.phase1} strong />
            {r.phase2.length > 0 && <ModuleList title="Phase 2 — once Phase 1 is running" items={r.phase2} />}
          </div>
          {(r.size.users !== undefined || r.size.sites !== undefined || r.current) && (
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
              {[r.size.users !== undefined && `${r.size.users} users`, r.size.sites !== undefined && `${r.size.sites} location${r.size.sites === 1 ? '' : 's'}`]
                .filter(Boolean)
                .join(' · ')}
              {r.current ? `${r.size.users !== undefined || r.size.sites !== undefined ? '. ' : ''}We move your data across from ${r.current.label}, so nothing is lost.` : ''}
            </p>
          )}
        </ReportSection>
      )}

      <section className="print-avoid-break mt-14 overflow-hidden rounded-[28px] bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="eyebrow flex items-center gap-2 text-white/75">
          <Sparkles className="h-4 w-4 text-accent-light" aria-hidden="true" />
          How Team Back Office helps
        </p>
        <p className="font-display mt-3 max-w-3xl text-[24px] font-medium leading-snug sm:text-[28px]">
          We set up ERPNext around how you work — and stay with you after go-live.
        </p>
        <ul className="mt-5 grid gap-3 text-[14.5px] text-white/90 sm:grid-cols-2 lg:grid-cols-4">
          {[
            'One system for accounts & GST, billing, stock, purchase and payroll',
            `Your data moved across${r.current ? ` from ${r.current.label}` : ''} — nothing lost`,
            'Your team trained, in their own language',
            'On the web and the phone, with support when you need it',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-[3px] h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {own && (
        <>
          <CheckContact
            submissionId={own.submissionId}
            token={own.token}
            title="See ERPNext close these gaps — on your own data"
            body="Book a free demo: we show your Phase 1 modules with your own items, customers and invoices. No obligation."
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

function AreaRow({ area: a, open, onToggle }: { area: ErpArea; open: boolean; onToggle: () => void }) {
  const st = a.status ? STATUS[a.status] : null;
  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:flex-nowrap sm:px-6">
        <span className="flex w-full items-center gap-2.5 sm:w-48 sm:shrink-0">
          <Icon name={a.icon} className="h-[18px] w-[18px] shrink-0 text-brand" />
          <span className="text-[15px] font-semibold text-ink">{a.title}</span>
        </span>
        <span className="relative h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          {a.score !== null && <span className={clsx('absolute inset-y-0 left-0 rounded-full', st?.bar)} style={{ width: `${Math.max(3, a.score)}%` }} />}
          <span className="absolute inset-y-[-3px] w-0.5 bg-ink" style={{ left: `${ERP_TARGET}%` }} />
        </span>
        <span className="font-display w-10 text-right text-[18px] font-medium tabular-nums text-ink">{a.score ?? '–'}</span>
        <span className={clsx('rounded-full px-2.5 py-1 text-[12px] font-semibold', st ? st.chip : 'bg-paper-deep text-muted')}>{st ? st.label : 'Not answered'}</span>
        {a.gaps.length > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-full border border-brand/40 px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft"
          >
            {open ? 'Hide' : `See ${a.gaps.length} gap${a.gaps.length === 1 ? '' : 's'}`}
            {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        ) : (
          <span className="ml-auto w-[104px]" aria-hidden="true" />
        )}
      </div>
      {open && (
        <div className="animate-fade space-y-3 bg-paper-deep/40 px-4 pb-5 pt-1 sm:px-6">
          {a.gaps.map((g) => (
            <div key={g.id} className="rounded-2xl border border-line bg-card px-4 py-3.5">
              <p className="text-[15px] font-semibold text-ink">{g.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">You said: {g.answer}</p>
              <p className="mt-2 flex gap-2 text-[14px] leading-relaxed text-ink">
                <ArrowRight className="mt-[3px] h-4 w-4 shrink-0 text-ok-ink" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">With ERPNext:</strong> {g.fix}
                </span>
              </p>
            </div>
          ))}
          {a.strengths.length > 0 && (
            <p className="text-[13.5px] text-ok-ink">Already working: {a.strengths.map((s) => s.title.toLowerCase()).join('; ')}.</p>
          )}
        </div>
      )}
    </li>
  );
}

function GapCard({ gap: g, n }: { gap: ErpInsight; n: number }) {
  return (
    <li className="rounded-[20px] border border-line bg-card px-5 py-5 shadow-card sm:px-6">
      <div className="flex items-start gap-4">
        <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-risk-soft text-[15px] font-semibold text-risk-ink" aria-hidden="true">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-display text-[19px] font-medium leading-snug text-ink">{g.title}</p>
            <span className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">{g.areaTitle}</span>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{g.why}</p>
          <p className="mt-3 rounded-xl bg-ok-soft px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
            <strong className="font-semibold text-ok-ink">With ERPNext · {MODULES[g.module]}:</strong> {g.fix}
          </p>
          {g.hours > 0 && <p className="mt-2 text-[12.5px] text-muted">Takes you about {g.hours} hours a month today.</p>}
        </div>
      </div>
    </li>
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
