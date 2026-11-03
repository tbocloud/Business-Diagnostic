'use client';

import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BarTrack } from '@/components/results/AreaScores';
import { Gauge } from '@/components/results/Gauge';
import { SECTION_BY_ID } from '@/lib/sections';
import type { SectionId, SectionResult, SectionStatus } from '@/lib/types';

// Clearly fake numbers for the landing page preview — never real client data.
const TARGET = 60;
const SAMPLE: [SectionId, number, SectionStatus][] = [
  ['sales', 57, 'push'],
  ['marketing', 38, 'priority'],
  ['customers', 81, 'healthy'],
  ['finance', 64, 'healthy'],
];

const rows: SectionResult[] = SAMPLE.map(([id, score, status]) => {
  const s = SECTION_BY_ID[id];
  return {
    id,
    title: s.title,
    short: s.short,
    icon: s.icon,
    score,
    target: TARGET,
    status,
    statusLabel: '',
    asked: 5,
    answered: 5,
    skipped: 0,
    strengths: [],
    watch: [],
    gaps: [],
    ownWords: [],
    note: '',
  };
});

export function SamplePreview() {
  return (
    <figure
      aria-label="Sample report with made-up numbers for an example bakery"
      className="relative mx-auto w-full max-w-[30rem]"
    >
      {/* the sheet underneath, for a stacked-paper feel */}
      <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rotate-[2.5deg] rounded-[26px] border border-line bg-paper-deep" />
      <div className="relative rotate-[-1.2deg] rounded-[26px] border border-line bg-card p-5 shadow-sheet transition-transform duration-500 hover:rotate-0 sm:p-7">
        <span className="absolute -top-3 right-6 rotate-[3deg] rounded-md border border-accent-ink/30 bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink shadow-card">
          Sample report
        </span>

        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="eyebrow text-[10px]">Health check · example</p>
            <p className="font-display mt-1 text-[22px] font-medium leading-tight text-ink">Noor Bakery &amp; Café</p>
            <p className="mt-0.5 text-[12px] text-muted">Food · Growing · 2–10 people</p>
          </div>
          <div className="w-[118px] shrink-0">
            <Gauge value={61} target={TARGET} size="sm" showTargetLabel={false} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5" aria-hidden="true">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_6.4rem]">
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                <Icon name={r.icon} className="h-3.5 w-3.5 text-ink-2" />
                {r.short}
              </span>
              <BarTrack s={r} thin />
              <StatusBadge status={r.status} size="sm" className="justify-self-end max-sm:hidden" />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-brand p-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-light">The real gap</p>
          <div className="mt-2 flex items-center gap-2.5 text-[13px]">
            <span className="font-display font-display-italic min-w-0 flex-1 leading-snug text-white/90">
              “Not enough customers”
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
            <span className="min-w-0 flex-1 font-semibold leading-snug">Marketing is the deeper cause</span>
          </div>
        </div>

      </div>
      <figcaption className="mt-6 text-center text-[12.5px] text-muted">Made-up numbers for an example business.</figcaption>
    </figure>
  );
}
