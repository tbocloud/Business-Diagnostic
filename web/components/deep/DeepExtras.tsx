import clsx from 'clsx';
import { SectionHeader } from '@/components/results/SectionHeader';
import { ServiceChip } from '@/components/results/ServiceChip';
import { type DeepProfit, type DeepResults, type DeepStage, STAGE_LABELS, type StageLevel } from '@/lib/deep';
import { rupees } from '@/lib/forms';

/** What only Stage 2 has, inside the full report: the stage, where the money goes, and the ideas in rupees. */
export function DeepExtras({ deep: d }: { deep: DeepResults }) {
  return (
    <>
      {d.stage && <StageSection stage={d.stage} />}
      {d.profit && d.profit.split.length > 1 && <MoneySection profit={d.profit} />}
      {d.levers.length > 0 && <IdeasSection levers={d.levers} />}
    </>
  );
}

function StageSection({ stage }: { stage: DeepStage }) {
  return (
    <section aria-labelledby="deep-stage" className="print-avoid-break">
      <SectionHeader id="deep-stage" eyebrow="Your stage" title={`You are at: ${stage.label}`} lead={stage.blurb} />
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`Stage ${stage.level} of 4`}>
        {([1, 2, 3, 4] as StageLevel[]).map((n) => (
          <li
            key={n}
            aria-current={n === stage.level ? 'step' : undefined}
            className={clsx(
              'rounded-2xl border px-4 py-3',
              n === stage.level ? 'border-brand bg-brand text-white shadow-lift' : n < stage.level ? 'border-brand/30 bg-brand-soft/50 text-ink' : 'border-line bg-card text-muted',
            )}
          >
            <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.12em]', n === stage.level ? 'text-white/80' : 'text-muted')}>Stage {n}</p>
            <p className="font-display mt-0.5 text-[16px] font-medium">{STAGE_LABELS[n].label}</p>
          </li>
        ))}
      </ol>
      {stage.dims.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
          {stage.dims.map((dim) => (
            <li key={dim.id} className="rounded-[18px] border border-line bg-card px-4 py-4 shadow-card print:shadow-none">
              <p className="text-[13px] font-medium text-ink-2">{dim.label}</p>
              <p className="font-display mt-1.5 text-[20px] font-medium text-ink">{STAGE_LABELS[dim.level].label}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">{dim.value}</p>
              <div className="mt-3 flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={clsx('h-1.5 flex-1 rounded-full', n <= dim.level ? 'bg-brand' : 'bg-line')} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {stage.holdingBack && (
        <p className="mt-4 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3.5 text-[14.5px] leading-relaxed text-ink">
          <strong className="font-semibold">What holds you here: {stage.holdingBack.label}.</strong> {stage.holdingBack.note}
        </p>
      )}
    </section>
  );
}

const COST_COLOURS = ['bg-ink/70', 'bg-brand', 'bg-accent', 'bg-warn', 'bg-ink-2/50'];

function MoneySection({ profit }: { profit: DeepProfit }) {
  const total = profit.split.reduce((n, s) => n + s.amount, 0) || 1;
  let cost = 0;
  const parts = profit.split.map((s) => ({
    ...s,
    colour: s.tone === 'profit' ? 'bg-ok' : s.tone === 'loss' ? 'bg-risk' : COST_COLOURS[cost++ % COST_COLOURS.length],
  }));
  return (
    <section aria-labelledby="deep-money" className="print-avoid-break">
      <SectionHeader id="deep-money" eyebrow="Your profit" title="Where every ₹100 of sales goes" lead="From your own costs — what each one takes, and what is left at the end of the month." />
      <div className="rounded-[22px] border border-line bg-card px-5 py-6 shadow-card sm:px-7 print:shadow-none">
        <div className="flex h-5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          {parts.map((s) => (
            <span key={s.label} className={s.colour} style={{ width: `${(s.amount / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 text-[14px] text-ink-2">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={clsx('h-3 w-3 shrink-0 rounded-full', s.colour)} />
                {s.label}
              </span>
              <strong className={clsx('font-display text-[18px] font-medium tabular-nums', s.tone === 'loss' ? 'text-risk-ink' : s.tone === 'profit' ? 'text-ok-ink' : 'text-ink')}>
                ₹{Math.round(s.amount)}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function IdeasSection({ levers }: { levers: DeepResults['levers'] }) {
  return (
    <section aria-labelledby="deep-ideas" className="print-avoid-break">
      <SectionHeader id="deep-ideas" eyebrow="Growth ideas" title="Ideas worth real money" lead="Worked out from your own figures, biggest first — with the first step for each." />
      <ol className="space-y-3">
        {levers.map((l, i) => (
          <li key={l.id} className="flex flex-col gap-4 rounded-[20px] border border-line bg-card px-5 py-5 shadow-card sm:flex-row sm:items-start sm:px-6 print:shadow-none">
            <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-semibold text-white" aria-hidden="true">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[19px] font-medium leading-snug text-ink">{l.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{l.note}</p>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink">
                <strong className="font-semibold">First step:</strong> {l.firstStep}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
              <p className="font-display text-[24px] font-medium leading-none text-ok-ink">
                +{rupees(l.amount)}
                <span className="ml-1 text-[13px] font-normal text-ink-2">{l.per === 'month' ? 'a month' : 'once, in cash'}</span>
              </p>
              <ServiceChip id={l.service} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
