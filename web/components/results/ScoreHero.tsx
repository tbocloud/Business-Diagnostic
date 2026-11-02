import type { Results } from '@/lib/types';
import { Gauge } from './Gauge';

export function ScoreHero({ results }: { results: Results }) {
  const { overall, band, summary, target, levelLabel } = results;
  return (
    <section
      aria-labelledby="score-title"
      className="print-avoid-break print-plain grid overflow-hidden rounded-[28px] border border-line bg-card shadow-card md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] print:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <div className="relative border-b border-line bg-gradient-to-b from-paper/70 to-card px-8 pb-6 pt-8 md:border-b-0 md:border-r md:px-10 md:py-10 print:border-b-0 print:border-r print:px-6 print:py-6">
        <p className="eyebrow text-center">Overall health</p>
        <Gauge value={overall} target={target} className="mt-3 max-w-[290px]" />
        <p className="mt-1 text-center text-[12.5px] text-muted">
          Target {target} is the guide level for a {levelLabel.toLowerCase()} business.
        </p>
      </div>
      <div className="flex flex-col justify-center px-6 py-8 sm:px-10 md:py-10 print:py-6">
        <h2 id="score-title" className="font-display text-[30px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[40px]">
          {band.label}
        </h2>
        <p className="mt-2 text-[16px] font-medium leading-relaxed text-ink-2 sm:text-[17px]">{band.blurb}</p>
        <p className="mt-5 border-l-2 border-accent pl-4 text-[15.5px] leading-[1.7] text-ink sm:text-[16.5px]">{summary}</p>
      </div>
    </section>
  );
}
