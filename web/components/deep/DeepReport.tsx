'use client';

import clsx from 'clsx';
import { ServiceChip } from '@/components/results/ServiceChip';
import { CheckContact, Notes, ReportSection, ReportTitle, Tile, TileGrid } from '@/components/forms/ReportFrame';
import { Icon } from '@/components/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import type { ServiceId } from '@/lib/types';
import { type DeepProfit, type DeepResults, STAGE_LABELS, type StageLevel } from '@/lib/deep';
import { rupees } from '@/lib/forms';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

export function DeepReport({
  results: r,
  businessName,
  own,
}: {
  results: DeepResults;
  businessName: string;
  /** The client's own report (not a shared link): offer the next steps. */
  own?: { submissionId?: number; token?: string };
}) {
  const nothing = !r.stage && !r.profit && !r.customers && !r.cash && r.levers.length === 0;
  return (
    <>
      <ReportTitle
        eyebrow="Stage 2 · Your real numbers"
        title={businessName || 'Your business'}
        lead="Worked out from your own figures — rough numbers are fine, the direction is what matters."
      />

      {!nothing && <KeyStrip r={r} />}

      {nothing && (
        <p className="mt-10 rounded-2xl border border-line bg-card px-5 py-6 text-[15px] text-ink-2">
          You skipped the questions this report is built from. Add a few figures — even rough ones — and it fills in.
        </p>
      )}

      {r.stage && (
        <ReportSection id="deep-stage" eyebrow="Your stage" title={`You are at: ${r.stage.label}`} lead={r.stage.blurb}>
          <StageLadder level={r.stage.level} />
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {r.stage.dims.map((d) => (
              <li key={d.id} className="rounded-[18px] border border-line bg-card px-4 py-4 shadow-card">
                <p className="text-[13px] font-medium text-ink-2">{d.label}</p>
                <p className="font-display mt-1.5 text-[20px] font-medium text-ink">{STAGE_LABELS[d.level].label}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{d.value}</p>
                <div className="mt-3 flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={clsx('h-1.5 flex-1 rounded-full', n <= d.level ? 'bg-brand' : 'bg-line')} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {r.stage.holdingBack && (
            <p className="mt-4 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3.5 text-[14.5px] leading-relaxed text-ink">
              <strong className="font-semibold">What holds you here: {r.stage.holdingBack.label}.</strong> {r.stage.holdingBack.note}
            </p>
          )}
        </ReportSection>
      )}

      {r.profit && (
        <ReportSection id="deep-profit" eyebrow="Your profit" title="Where your money goes" lead="Every ₹100 of sales, and what is left at the end of the month.">
          <TileGrid>
            <Tile icon="IndianRupee" label="Sales" big={`${rupees(r.profit.sales)}`} note={r.growth !== undefined ? `a month · ${r.growth >= 0 ? '+' : ''}${r.growth}% vs last year` : 'a month'} />
            {r.profit.net !== undefined && (
              <Tile
                icon="PiggyBank"
                label={r.profit.net >= 0 ? 'Profit left each month' : 'Loss each month'}
                big={rupees(r.profit.net)}
                note={`${pct(r.profit.netPct!)} of sales · healthy for your kind of business: ${r.profit.healthyPct}% or more`}
                tone={r.profit.netPct! >= r.profit.healthyPct ? 'good' : r.profit.netPct! >= 0 ? 'warn' : 'gap'}
              />
            )}
            {r.profit.breakEven !== undefined && (
              <Tile
                icon="Target"
                label="Sales you need just to break even"
                big={rupees(r.profit.breakEven)}
                note={`a month — you are ${r.profit.sales >= r.profit.breakEven ? `${pct(((r.profit.sales - r.profit.breakEven) / r.profit.breakEven) * 100)} above it` : 'below it'}`}
                tone={r.profit.sales >= r.profit.breakEven * 1.15 ? 'good' : r.profit.sales >= r.profit.breakEven ? 'warn' : 'gap'}
              />
            )}
          </TileGrid>
          {r.profit.split.length > 1 && <SplitBar split={r.profit.split} />}
        </ReportSection>
      )}

      {r.levers.length > 0 && (
        <ReportSection id="deep-growth" eyebrow="Growth ideas" title="Ideas worth real money" lead="Worked out from your figures, biggest first. Each one is something we help businesses like yours do.">
          <ol className="space-y-3">
            {r.levers.map((l, i) => (
              <li key={l.id} className="flex flex-col gap-3 rounded-[18px] border border-line bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center">
                <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-semibold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-medium text-ink">{l.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{l.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                  <p className="font-display text-[22px] font-medium text-ok-ink">
                    +{rupees(l.amount)}
                    <span className="ml-1 text-[13px] font-normal text-ink-2">{l.per === 'month' ? 'a month' : 'once, in cash'}</span>
                  </p>
                  <ServiceChip id={l.service} />
                </div>
              </li>
            ))}
          </ol>
        </ReportSection>
      )}

      {r.levers.length > 0 && <NinetyDays r={r} />}

      {r.customers && (
        <ReportSection id="deep-customers" eyebrow="Your customers" title="How good are your customers?">
          <TileGrid>
            {r.customers.active !== undefined && <Tile icon="Users" label="Customers in the last 3 months" big={r.customers.active.toLocaleString('en-IN')} />}
            {r.customers.good !== undefined && (
              <Tile icon="UserCheck" label="Good customers" big={`${r.customers.good} in 10`} note="come back, pay on time, don’t haggle hard · aim: 6 or more" tone={r.customers.good >= 6 ? 'good' : r.customers.good >= 4 ? 'warn' : 'gap'} />
            )}
            {r.customers.perCustomer !== undefined && <Tile icon="IndianRupee" label="Sales per customer" big={rupees(r.customers.perCustomer)} note="a month, on average" />}
            {r.customers.top10 !== undefined && (
              <Tile icon="Target" label="Sales from your top 10 customers" big={pct(r.customers.top10)} note="aim: under 30%, so no few customers can sink you" tone={r.customers.top10 >= 50 ? 'gap' : r.customers.top10 >= 30 ? 'warn' : 'good'} />
            )}
            {r.customers.churnPct !== undefined && (
              <Tile icon="UserMinus" label="Regular customers lost in a year" big={pct(r.customers.churnPct)} note="aim: under 10%" tone={r.customers.churnPct >= 20 ? 'gap' : r.customers.churnPct >= 10 ? 'warn' : 'good'} />
            )}
          </TileGrid>
          <Notes notes={r.customers.notes} />
        </ReportSection>
      )}

      {r.cash && (
        <ReportSection id="deep-cash" eyebrow="Your cash" title="Money in the bank, and money stuck outside it">
          <TileGrid>
            {r.cash.receivable !== undefined && (
              <Tile
                icon="CalendarClock"
                label="Customers owe you"
                big={rupees(r.cash.receivable)}
                note={r.cash.receivableDays !== undefined ? `about ${Math.round(r.cash.receivableDays)} days of sales · aim: under 30` : undefined}
                tone={r.cash.receivableDays === undefined ? 'neutral' : r.cash.receivableDays <= 30 ? 'good' : r.cash.receivableDays <= 60 ? 'warn' : 'gap'}
              />
            )}
            {r.cash.payable !== undefined && <Tile icon="Wallet" label="You owe suppliers" big={rupees(r.cash.payable)} />}
            {r.cash.runwayMonths !== undefined && (
              <Tile
                icon="Clock"
                label="Your cash covers"
                big={`${Math.round(r.cash.runwayMonths * 10) / 10} months`}
                note="of costs, if sales stopped · aim: 3 months"
                tone={r.cash.runwayMonths >= 3 ? 'good' : r.cash.runwayMonths >= 1 ? 'warn' : 'gap'}
              />
            )}
          </TileGrid>
          <Notes notes={r.cash.notes} />
        </ReportSection>
      )}

      {r.levers.length > 0 && <HowWeHelp r={r} />}

      {own && (
        <>
          <CheckContact
            submissionId={own.submissionId}
            token={own.token}
            title="Want a plan built on these numbers?"
            body="One of our consultants will go through this with you — free, and no obligation."
          />
          <div className="no-print mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/erp" variant="secondary">
              Take the ERP check
            </ButtonLink>
            <ButtonLink href="/results" variant="quiet">
              Back to your Stage 1 report
            </ButtonLink>
          </div>
        </>
      )}
    </>
  );
}

function StageLadder({ level }: { level: StageLevel }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`Stage ${level} of 4`}>
      {([1, 2, 3, 4] as StageLevel[]).map((n) => (
        <li
          key={n}
          aria-current={n === level ? 'step' : undefined}
          className={clsx(
            'rounded-2xl border px-4 py-3',
            n === level ? 'border-brand bg-brand text-white shadow-lift' : n < level ? 'border-brand/30 bg-brand-soft/50 text-ink' : 'border-line bg-card text-muted',
          )}
        >
          <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.12em]', n === level ? 'text-white/80' : 'text-muted')}>Stage {n}</p>
          <p className="font-display mt-0.5 text-[16px] font-medium">{STAGE_LABELS[n].label}</p>
        </li>
      ))}
    </ol>
  );
}

const SPLIT_COLOURS = ['bg-ink/70', 'bg-brand', 'bg-accent', 'bg-warn', 'bg-ink-2/50'];

function SplitBar({ split }: { split: DeepProfit['split'] }) {
  const total = split.reduce((n, s) => n + s.amount, 0) || 1;
  let cost = 0;
  const colour = (s: (typeof split)[number]) => (s.tone === 'profit' ? 'bg-ok' : s.tone === 'loss' ? 'bg-risk' : SPLIT_COLOURS[cost++ % SPLIT_COLOURS.length]);
  const coloured = split.map((s) => ({ ...s, colour: colour(s) }));
  return (
    <div className="mt-6 rounded-[18px] border border-line bg-card px-5 py-5 shadow-card">
      <p className="text-[13px] font-medium text-ink-2">Every ₹100 of sales</p>
      <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-line" aria-hidden="true">
        {coloured.map((s) => (
          <span key={s.label} className={s.colour} style={{ width: `${(s.amount / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-2">
        {coloured.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx('h-2.5 w-2.5 rounded-full', s.colour)} />
            {s.label} <strong className={clsx('font-semibold', s.tone === 'loss' ? 'text-risk-ink' : s.tone === 'profit' ? 'text-ok-ink' : 'text-ink')}>₹{Math.round(s.amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}


/** The four numbers that matter most, before the detail. */
function KeyStrip({ r }: { r: DeepResults }) {
  const items = [
    r.stage && { icon: 'Compass', label: 'Your stage', big: r.stage.label, note: r.stage.holdingBack ? `held back by ${r.stage.holdingBack.label.toLowerCase()}` : `stage ${r.stage.level} of 4` },
    r.profit?.net !== undefined && {
      icon: 'PiggyBank',
      label: r.profit.net >= 0 ? 'Profit a month' : 'Loss a month',
      big: rupees(r.profit.net),
      note: `${pct(r.profit.netPct!)} of sales`,
    },
    r.levers[0] && { icon: 'TrendingUp', label: 'Your biggest idea', big: `+${rupees(r.levers[0].amount)}`, note: r.levers[0].title.toLowerCase() },
    r.cash?.receivable !== undefined && { icon: 'CalendarClock', label: 'Stuck with customers', big: rupees(r.cash.receivable), note: r.cash.receivableDays ? `${Math.round(r.cash.receivableDays)} days of sales` : 'owed to you' },
  ].filter(Boolean) as { icon: string; label: string; big: string; note: string }[];
  if (!items.length) return null;
  return (
    <ul aria-label="Key numbers" className="print-avoid-break mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-line bg-line lg:grid-cols-4">
      {items.map((i) => (
        <li key={i.label} className="bg-card px-4 py-5 sm:px-6">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            <Icon name={i.icon} className="h-4 w-4 text-brand" />
            {i.label}
          </p>
          <p className="font-display mt-2 text-[24px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">{i.big}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">{i.note}</p>
        </li>
      ))}
    </ul>
  );
}

/** Three months, one idea each, with the first step to take. */
function NinetyDays({ r }: { r: DeepResults }) {
  const once = r.levers.filter((l) => l.per === 'once');
  const monthly = r.levers.filter((l) => l.per === 'month');
  // Cash first (it pays for the rest), then the ideas worth most a month.
  const plan = [...once, ...monthly].slice(0, 3);
  return (
    <ReportSection id="deep-plan" eyebrow="Your next 90 days" title="One idea a month, starting now" lead="Do these in order — each one pays for the next.">
      <ol className="grid gap-3 lg:grid-cols-3">
        {plan.map((l, i) => (
          <li key={l.id} className="flex flex-col rounded-[18px] border border-line bg-card px-5 py-5 shadow-card">
            <p className="eyebrow text-brand">Month {i + 1}</p>
            <p className="font-display mt-1.5 text-[18px] font-medium leading-snug text-ink">{l.title}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              <strong className="font-semibold text-ink">First step:</strong> {l.firstStep}
            </p>
            <p className="mt-auto pt-3 text-[13px] font-semibold text-ok-ink">
              Worth +{rupees(l.amount)} {l.per === 'month' ? 'a month' : 'once'}
            </p>
          </li>
        ))}
      </ol>
    </ReportSection>
  );
}

/** Which of our services carry which idea. */
function HowWeHelp({ r }: { r: DeepResults }) {
  const by = new Map<ServiceId, string[]>();
  for (const l of r.levers) by.set(l.service, [...(by.get(l.service) ?? []), l.title]);
  return (
    <ReportSection id="deep-help" eyebrow="How we help" title="Who does the heavy lifting">
      <ul className="grid gap-3 md:grid-cols-3">
        {[...by.entries()].map(([id, titles]) => (
          <li key={id} className="rounded-[18px] border border-line bg-card px-5 py-5 shadow-card">
            <ServiceChip id={id} />
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{BRAND.services[id].pitch}</p>
            <ul className="mt-3 space-y-1.5">
              {titles.map((t) => (
                <li key={t} className="flex gap-2 text-[13.5px] text-ink">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
