import { ListChecks, Search, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import type { Results } from '@/lib/types';

function Stat({ Icon, label, value, note }: { Icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <li className="bg-card px-4 py-5 sm:px-6 print:px-4 print:py-3">
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
        {label}
      </p>
      <p className="font-display mt-2 text-[34px] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[40px] print:text-[30px]">
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{note}</p>
    </li>
  );
}

/** Hairline dividers come from a 1px gap over a line-coloured background, so they work at any column count. */
export function StatStrip({ stats }: { stats: Results['stats'] }) {
  return (
    <ul
      aria-label="Your check-up in numbers"
      className="print-avoid-break grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-line bg-line lg:grid-cols-4 print:grid-cols-4"
    >
      <Stat Icon={Sparkles} label="Strengths found" value={String(stats.strengths)} note="Things working well to build on" />
      <Stat Icon={Search} label="Gaps found" value={String(stats.gaps)} note="Areas quietly costing time or money" />
      <Stat Icon={Zap} label="Quick wins" value={String(stats.quickWins)} note="Gaps you can start fixing this week" />
      <Stat
        Icon={ListChecks}
        label="Questions answered"
        value={`${stats.answered}`}
        note={`of ${stats.asked} asked${stats.skipped ? ` · ${stats.skipped} skipped` : ''}`}
      />
    </ul>
  );
}
