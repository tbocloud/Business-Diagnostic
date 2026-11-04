import { Check, Footprints } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { SECTION_BY_ID } from '@/lib/sections';
import type { Insight, Results, SectionId } from '@/lib/types';
import { EFFORT_META } from './labels';
import { SectionHeader } from './SectionHeader';

/** The area's name and icon — a Stage 1 section, or (Stage 2, the ERP check) the title and icon given. */
export function AreaTag({ id, title, icon }: { id: SectionId; title?: string; icon?: string }) {
  const s = SECTION_BY_ID[id] ?? { title: title ?? '', icon: icon ?? 'CircleDot' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
      <Icon name={s.icon} className="h-3.5 w-3.5" />
      {s.title}
    </span>
  );
}

export function EffortBadge({ effort }: { effort: Insight['effort'] }) {
  const m = EFFORT_META[effort];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${m.className}`}>
      <m.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {m.label}
    </span>
  );
}

function StrengthItem({ i }: { i: Insight }) {
  return (
    <li className="print-avoid-break flex gap-3.5 border-t border-line py-4 first:border-t-0 first:pt-1">
      <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ok-soft text-ok-ink">
        <Check className="h-4 w-4" strokeWidth={2.75} />
      </span>
      <div className="min-w-0">
        <p className="text-[15.5px] font-semibold leading-snug text-ink">{i.title}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          You said: <span className="text-ink">{i.answerLabel}</span>
        </p>
        <p className="mt-2">
          <AreaTag id={i.section} title={i.sectionTitle} icon={i.sectionIcon} />
        </p>
      </div>
    </li>
  );
}

function GapItem({ i, n }: { i: Insight; n: number }) {
  return (
    <li className="print-avoid-break print-plain rounded-[20px] border border-line bg-card p-5 shadow-card">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="font-display grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-[13px] font-semibold text-ink-2"
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold leading-snug text-ink">{i.title}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            You said: <span className="text-ink">{i.answerLabel}</span>
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{i.why}</p>
          <div className="mt-3.5 rounded-xl bg-paper px-3.5 py-3">
            <p className="flex gap-2 text-[14.5px] leading-relaxed text-ink">
              <Footprints className="mt-[3px] h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="font-semibold">First step:</span> {i.fix}
              </span>
            </p>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
            <AreaTag id={i.section} title={i.sectionTitle} icon={i.sectionIcon} />
            <EffortBadge effort={i.effort} />
          </div>
        </div>
      </div>
    </li>
  );
}

/** "Top 6 of 17" when the list is a selection, so it always agrees with the stat tiles. */
function CountBadge({ shown, total, className }: { shown: number; total: number; className: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-sans text-[12px] font-semibold ${className}`}>
      {shown < total ? `Top ${shown} of ${total}` : total}
    </span>
  );
}

export function Insights({ strengths, gaps, stats }: { strengths: Insight[]; gaps: Insight[]; stats: Results['stats'] }) {
  return (
    <section aria-labelledby="insights-title">
      <SectionHeader
        id="insights-title"
        eyebrow="Strengths & gaps"
        title="What’s working, and what’s holding you back"
        lead="We lead with what’s going well — then the gaps that matter most, each with a simple first step."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 print:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="self-start rounded-[24px] border border-line bg-card p-5 shadow-card print-plain sm:p-6 lg:sticky lg:top-6">
          <h3 className="print-keep-with-next font-display flex flex-wrap items-center gap-2 text-[22px] font-medium text-ink">
            What’s working
            <CountBadge shown={strengths.length} total={stats.strengths} className="bg-brand-soft text-brand" />
          </h3>
          {strengths.length ? (
            <ul className="mt-4">
              {strengths.map((i) => (
                <StrengthItem key={i.questionId} i={i} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              No standout strengths showed up yet. That’s common early on — the quick wins below are the fastest way to build some.
            </p>
          )}
        </div>
        <div>
          <h3 className="print-keep-with-next font-display flex flex-wrap items-center gap-2 text-[22px] font-medium text-ink">
            What’s holding you back
            <CountBadge shown={gaps.length} total={stats.gaps} className="bg-paper-deep text-ink-2" />
          </h3>
          {gaps.length ? (
            <ol className="mt-4 space-y-3">
              {gaps.map((i, n) => (
                <GapItem key={i.questionId} i={i} n={n + 1} />
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-[20px] border border-line bg-card p-5 text-[14.5px] leading-relaxed text-ink-2">
              No major gaps found — well done. Have a look at the “could be stronger” notes in each area below for your next improvements.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
