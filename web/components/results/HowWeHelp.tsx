'use client';

import clsx from 'clsx';
import { ArrowRight, CircleAlert, CircleDot } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import type { ServiceRecommendation } from '@/lib/types';
import { serviceImpact } from './labels';
import { SectionHeader } from './SectionHeader';

const MAX_ITEMS = 5;

/**
 * Our services, matched to THIS business's gaps: each card says what the service is and lists
 * the client's own gaps it fixes (most urgent first). Only services that fix something appear.
 */
export function HowWeHelp({
  services,
  businessName,
  onGetHelp,
}: {
  services: ServiceRecommendation[];
  businessName: string;
  onGetHelp?: () => void;
}) {
  if (services.length === 0) return null;
  return (
    <section aria-labelledby="how-we-help-title" className="print-avoid-break">
      <SectionHeader
        id="how-we-help-title"
        eyebrow={`How ${BRAND.company} can help`}
        title="The fastest way to close these gaps"
        lead={`${BRAND.company} provides ERP, digital marketing and AI. Here is exactly what each would fix in ${businessName}.`}
      />
      <div className={clsx('grid gap-4', services.length > 1 && 'lg:grid-cols-2', services.length > 2 && 'xl:grid-cols-3')}>
        {services.map((rec, i) => {
          const svc = BRAND.services[rec.id];
          const shown = rec.items.slice(0, MAX_ITEMS);
          const more = rec.items.length - shown.length;
          return (
            <article
              key={rec.id}
              className={clsx(
                'flex flex-col rounded-[22px] border p-5 shadow-card sm:p-6',
                i === 0 ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                    i === 0 ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand',
                  )}
                >
                  <Icon name={svc.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  {i === 0 && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-light">Biggest impact for you</p>}
                  <h3 className="font-display text-[22px] font-medium leading-tight">{svc.long}</h3>
                </div>
              </div>
              <p className={clsx('mt-3 text-[14px] leading-relaxed', i === 0 ? 'text-white/85' : 'text-ink-2')}>{svc.pitch}</p>

              <p className={clsx('mt-4 text-[12px] font-semibold uppercase tracking-[0.1em]', i === 0 ? 'text-white/70' : 'text-muted')}>
                {serviceImpact(rec.items)}
              </p>
              <ul className="mt-2 space-y-2">
                {shown.map((it) => (
                  <li key={it.questionId} className="flex items-start gap-2 text-[14px] leading-snug">
                    {it.kind === 'gap' ? (
                      <CircleAlert className={clsx('mt-0.5 h-4 w-4 shrink-0', i === 0 ? 'text-accent-light' : 'text-risk-ink')} aria-label="Needs work" />
                    ) : (
                      <CircleDot className={clsx('mt-0.5 h-4 w-4 shrink-0', i === 0 ? 'text-white/70' : 'text-warn-ink')} aria-label="Could be stronger" />
                    )}
                    <span>
                      {it.title}
                      <span className={clsx('block text-[12px]', i === 0 ? 'text-white/60' : 'text-muted')}>{it.sectionTitle}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {more > 0 && (
                <p className={clsx('mt-2 text-[13px]', i === 0 ? 'text-white/70' : 'text-muted')}>
                  + {more} more — open “What to do” on any area to see them.
                </p>
              )}

              {onGetHelp && (
                <div className="mt-auto pt-5">
                  <Button
                    variant={i === 0 ? 'accent' : 'secondary'}
                    className="no-print w-full"
                    onClick={onGetHelp}
                  >
                    Talk to us about {svc.name}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
