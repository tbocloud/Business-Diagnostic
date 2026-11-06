import clsx from 'clsx';
import { Check, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/results/SectionHeader';
import { BRAND } from '@/lib/brand';
import type { ErpResults } from '@/lib/erp';

/** What only the ERP check has, inside the full report: the setup today and the ERPNext plan. */
export function ErpExtras({ erp: r }: { erp: ErpResults }) {
  if (!r.phase1.length && !r.current?.note) return null;
  const size = [r.size.users !== undefined && `${r.size.users} user${r.size.users === 1 ? '' : 's'}`, r.size.sites !== undefined && `${r.size.sites} location${r.size.sites === 1 ? '' : 's'}`].filter(Boolean);
  return (
    <section aria-labelledby="erp-plan" className="print-avoid-break">
      <SectionHeader
        id="erp-plan"
        eyebrow="Your ERPNext plan"
        title={r.size.label ?? 'Where to start'}
        lead={`Start with the modules that close your biggest gaps, go live, then add the rest.${r.size.weeks ? ` Phase 1 usually takes ${r.size.weeks} for a business this size — a rough guide, confirmed after a demo on your own data.` : ''}`}
      />

      {r.current?.note && (
        <p className="mb-4 rounded-2xl border border-line bg-card px-5 py-4 text-[14.5px] leading-relaxed text-ink-2 shadow-card print:shadow-none">
          <strong className="font-semibold text-ink">Today, on {r.current.label}:</strong> {r.current.note}
        </p>
      )}

      {r.phase1.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <ModuleList title="Phase 1 — first to go live" items={r.phase1} strong />
          {r.phase2.length > 0 && <ModuleList title="Phase 2 — once Phase 1 is running" items={r.phase2} />}
        </div>
      )}

      {(size.length > 0 || r.when) && (
        <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
          {size.join(' · ')}
          {size.length > 0 && r.when ? ' · ' : ''}
          {r.when ? `You want to start: ${r.when.toLowerCase()}` : ''}
        </p>
      )}

      <div className="print-avoid-break mt-6 overflow-hidden rounded-[24px] border border-brand/25 bg-brand-soft/40 px-6 py-7 sm:px-9 sm:py-8">
        <p className="eyebrow flex items-center gap-2 text-brand">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          How {BRAND.company} sets it up
        </p>
        <p className="font-display mt-3 max-w-3xl text-[22px] font-medium leading-snug text-ink sm:text-[26px]">
          ERPNext, set up around how you work — and we stay with you after go-live.
        </p>
        <ul className="mt-5 grid gap-3 text-[14.5px] text-ink-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            'One system for accounts & GST, billing, stock, purchase and payroll',
            `Your data moved across${r.current ? ` from ${r.current.label}` : ''} — nothing lost`,
            'Your team trained, in their own language',
            'On the web and the phone, with support when you need it',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-[3px] h-4 w-4 shrink-0 text-ok-ink" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ModuleList({ title, items, strong }: { title: string; items: string[]; strong?: boolean }) {
  return (
    <div className={clsx('rounded-[18px] border px-5 py-5', strong ? 'border-brand/40 bg-brand-soft/40' : 'border-line bg-card shadow-card print:shadow-none')}>
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
