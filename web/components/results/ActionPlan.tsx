'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActionItem, Results } from '@/lib/types';
import { AreaTag } from './Insights';
import { slug } from './labels';
import { SectionHeader } from './SectionHeader';

const COLUMNS: { key: keyof Results['actionPlan']; title: string; note: string }[] = [
  { key: 'week', title: 'This week', note: 'Quick wins' },
  { key: 'month', title: 'Next 30 days', note: 'Bigger fixes' },
  { key: 'quarter', title: 'Next 90 days', note: 'Foundations' },
];

const itemKey = (i: ActionItem) => `${i.section}:${i.title}`;

function readDone(storageKey: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ActionPlan({ plan, businessName }: { plan: Results['actionPlan']; businessName: string }) {
  const storageKey = `business-health-check:plan:${slug(businessName)}`;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => setDone(readDone(storageKey)), [storageKey]);

  const toggle = (k: string) => {
    setDone((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (!next[k]) delete next[k];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage may be blocked — ticks still work for this visit */
      }
      return next;
    });
  };

  const total = plan.week.length + plan.month.length + plan.quarter.length;
  const ticked = [...plan.week, ...plan.month, ...plan.quarter].filter((i) => done[itemKey(i)]).length;

  return (
    <section aria-labelledby="plan-title">
      <SectionHeader
        id="plan-title"
        eyebrow="Your action plan"
        title="Start small. Keep going."
        lead="The first steps from your gaps, arranged by how long they take. Tick them off as you go — we’ll remember on this device."
        action={
          total > 0 ? (
            <p className="no-print text-[14px] text-ink-2" aria-live="polite">
              <span className="font-display text-[22px] font-medium text-ink">{ticked}</span> of {total} done
            </p>
          ) : undefined
        }
      />
      {total === 0 ? (
        <p className="rounded-[20px] border border-line bg-card p-6 text-[15px] text-ink-2">
          Nothing urgent to fix right now. Keep doing what works, and re-run the check in a few months.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
          {COLUMNS.map((col, ci) => {
            const items = plan[col.key];
            return (
              <div key={col.key} className="print-plain flex flex-col rounded-[22px] border border-line bg-card shadow-card">
                <div className="print-keep-with-next flex items-baseline justify-between gap-2 border-b border-line px-5 pb-3 pt-4">
                  <h3 className="font-display text-[20px] font-medium text-ink">
                    <span aria-hidden="true" className="mr-2 text-[14px] text-accent-ink">
                      0{ci + 1}
                    </span>
                    {col.title}
                  </h3>
                  <span className="text-[12px] font-medium text-muted">{col.note}</span>
                </div>
                {items.length ? (
                  <ul className="flex-1 px-2 py-2">
                    {items.map((item) => {
                      const k = itemKey(item);
                      const checked = !!done[k];
                      return (
                        <li key={k} className="print-avoid-break">
                          <label className="flex min-h-[44px] cursor-pointer gap-3 rounded-xl px-3 py-3 hover:bg-paper/70">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={checked}
                              onChange={() => toggle(k)}
                            />
                            <span
                              aria-hidden="true"
                              className={clsx(
                                'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
                                checked ? 'border-brand bg-brand text-white' : 'border-line-strong bg-card',
                              )}
                            >
                              {checked && <Check className="h-3.5 w-3.5 animate-badge-pop" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={clsx(
                                  'block text-[14.5px] leading-relaxed transition-colors',
                                  checked ? 'text-muted line-through decoration-muted/60' : 'text-ink',
                                )}
                              >
                                {item.fix}
                              </span>
                              <span className="mt-1.5 block text-[12.5px] leading-snug text-muted">Fixes: {item.title}</span>
                              <span className="mt-1 block">
                                <AreaTag id={item.section} title={item.sectionTitle} icon={item.sectionIcon} />
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="flex-1 px-5 py-6 text-[14px] text-muted">Nothing urgent here.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
