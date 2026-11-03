import clsx from 'clsx';
import { ArrowRight, CalendarClock, CalendarDays, Zap, type LucideIcon } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { contactLinks, ContactButtons } from '@/components/results/ContactCta';
import { Gauge } from '@/components/results/Gauge';
import { bigScale, KeyPointChip, kpStyle, sectionFor } from '@/components/results/keyPointMeta';
import { formatDate, goalLabels, profileLine, serviceImpact } from '@/components/results/labels';
import type { ReportSource } from '@/components/results/useReportData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BRAND } from '@/lib/brand';
import type { ActionItem, KeyPoint, Results, SectionResult } from '@/lib/types';
import type { Slide } from './model';

// Sizes use container-query units (cqw/cqh) of the slide stage, so type stays as large as the
// space allows on a TV, a 1280×720 laptop, a phone — and when presenter notes take room.
const BIG_SIZE = {
  xl: 'clamp(54px, min(13cqw, 21cqh), 180px)',
  lg: 'clamp(34px, min(6.4cqw, 11cqh), 104px)',
  md: 'clamp(26px, min(4cqw, 7.4cqh), 62px)',
};
const HEADLINE = 'clamp(19px, min(2.3cqw, 4.2cqh), 34px)';
const DETAIL = 'clamp(15px, min(1.55cqw, 3cqh), 22px)';
const PANEL_TEXT = 'clamp(15px, min(1.45cqw, 2.8cqh), 21px)';

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={clsx(
        'flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] sm:text-[13px]',
        light ? 'text-accent-light' : 'text-muted',
      )}
    >
      <span aria-hidden="true" className="h-px w-7 bg-accent" />
      {children}
    </p>
  );
}

const panel = 'w-full max-w-[min(100%,32rem)] rounded-[24px] border border-line bg-card p-[clamp(16px,2.4cqw,32px)] shadow-lift';
const panelLabel = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-muted';

// ── Title ───────────────────────────────────────────────────
export function TitleSlide({ results, source }: { results: Results; source: ReportSource }) {
  const goals = goalLabels(source.profile);
  return (
    <div className="relative flex min-h-full w-full flex-col justify-center overflow-hidden rounded-[clamp(20px,3cqw,40px)] bg-brand px-[clamp(24px,6cqw,96px)] py-[clamp(28px,7cqh,80px)] text-white shadow-sheet">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-white/[0.07] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <Eyebrow light>{BRAND.product} · Review</Eyebrow>
        <h1
          className="font-display mt-[clamp(14px,3cqh,32px)] text-balance font-medium leading-[1.02] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(42px, min(8.5cqw, 15cqh), 132px)' }}
        >
          {results.businessName}
        </h1>
        <p className="mt-[clamp(12px,2.6cqh,28px)] text-white/85" style={{ fontSize: HEADLINE }}>
          {profileLine(results.industryLabel, results.levelLabel, results.teamLabel)}
        </p>
        <div className="mt-[clamp(18px,4.5cqh,48px)] flex flex-wrap gap-x-8 gap-y-2 text-white/75" style={{ fontSize: DETAIL }}>
          <span>{formatDate(source.completedAt)}</span>
          {source.profile.ownerName?.trim() && <span>Prepared for {source.profile.ownerName.trim()}</span>}
          {goals.length > 0 && <span>Goals: {goals.join(' · ')}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Evidence panels ─────────────────────────────────────────
function MiniMeter({ score, target, potential }: { score: number; target?: number; potential?: number }) {
  return (
    <div className="relative h-[clamp(12px,2.2cqh,18px)] w-full rounded-full bg-data-track" aria-hidden="true">
      {potential !== undefined && (
        <span className="absolute inset-y-0 left-0 rounded-full bg-data/35" style={{ width: `${potential}%` }} />
      )}
      <span className="bar-grow absolute inset-y-0 left-0 rounded-full bg-data" style={{ width: `${score}%` }} />
      {target !== undefined && (
        <span
          className="absolute -top-[40%] h-[180%] w-[3px] -translate-x-1/2 rounded-full bg-ink ring-2 ring-card"
          style={{ left: `${target}%` }}
        />
      )}
    </div>
  );
}

/** Area name, its status (exact words), and score against the stage target. */
function AreaScore({ area }: { area: SectionResult }) {
  if (area.score === null) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-ink" style={{ fontSize: PANEL_TEXT }}>
          <Icon name={area.icon} className="h-5 w-5 text-brand" />
          {area.title}
        </p>
        <StatusBadge status={area.status} size="sm" />
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display font-medium leading-none text-ink" style={{ fontSize: 'clamp(34px, min(4.6cqw, 8.5cqh), 68px)' }}>
          {area.score}
        </span>
        <span className="text-[14px] text-muted">/ 100 · target {area.target}</span>
      </p>
      <div className="mt-3">
        <MiniMeter score={area.score} target={area.target} />
      </div>
    </div>
  );
}

function SaidQuote({ said, big }: { said: string; big?: boolean }) {
  return (
    <figure>
      <figcaption className={panelLabel}>You said</figcaption>
      <blockquote
        className="font-display font-display-italic mt-1.5 leading-snug text-ink"
        style={{ fontSize: big ? 'clamp(22px, min(2.8cqw, 5cqh), 40px)' : PANEL_TEXT }}
      >
        “{said}”
      </blockquote>
    </figure>
  );
}

function ChecklistPanel({ items, title, more }: { items: ActionItem[]; title: string; more: number }) {
  return (
    <div className={panel}>
      <p className={clsx(panelLabel, 'flex items-center gap-2')}>
        <Zap className="h-4 w-4 text-accent-ink" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={`${item.section}:${item.title}`} className="flex gap-3">
            <span aria-hidden="true" className="mt-[3px] h-5 w-5 shrink-0 rounded-[6px] border-2 border-line-strong bg-card" />
            <span>
              <span className="block leading-snug text-ink" style={{ fontSize: PANEL_TEXT }}>
                {item.fix}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-muted">{item.sectionTitle}</span>
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-3 text-[13px] font-medium text-muted">+ {more} more in the full plan</p>}
    </div>
  );
}

function PointVisual({ point, results }: { point: KeyPoint; results: Results }) {
  const area = sectionFor(point, results.sections);

  if (point.id === 'score' && results.overall !== null) {
    // The score is already the big number — the gauge shows the guide level instead of repeating it.
    return (
      <div className="w-[clamp(180px,min(30cqw,46cqh),400px)]">
        <Gauge
          value={results.overall}
          target={results.target}
          showTargetLabel={false}
          center={
            <>
              <span className="text-[13px] font-medium text-muted">Guide level</span>
              <span className="font-display text-[44px] font-medium leading-none text-ink">{results.target}</span>
              <span className="mt-1 text-[12px] text-muted">for your stage</span>
            </>
          }
        />
      </div>
    );
  }

  if (point.id === 'strength' && area) {
    return (
      <div className={clsx(panel, 'space-y-5')}>
        <AreaScore area={area} />
        {point.said && <SaidQuote said={point.said} />}
      </div>
    );
  }

  if (point.id === 'realgap' && results.realGap && results.realGap.actual.score !== null) {
    const g = results.realGap;
    return (
      <div className={panel}>
        {g.perceived && (
          <>
            <p className={panelLabel}>What you told us</p>
            <p className="font-display font-display-italic mt-1.5 leading-snug text-ink" style={{ fontSize: DETAIL }}>
              “{g.perceived.label}”
            </p>
            <p className={clsx(panelLabel, 'my-3 flex items-center gap-2')}>
              <ArrowRight className="h-4 w-4 text-accent-ink" aria-hidden="true" />
              What your answers show
            </p>
          </>
        )}
        <AreaScore area={g.actual} />
      </div>
    );
  }

  if (point.id === 'issue' && (point.said || area)) {
    return (
      <div className={clsx(panel, 'space-y-5')}>
        {point.said && <SaidQuote said={point.said} big />}
        {area && (
          <div className={clsx(point.said && 'border-t border-line pt-5')}>
            <AreaScore area={area} />
          </div>
        )}
      </div>
    );
  }

  if (point.id === 'quickwin') {
    const week = results.actionPlan.week;
    const list = week.length ? week : results.actionPlan.month;
    if (!list.length) return null;
    const shown = list.slice(0, 4);
    return (
      <ChecklistPanel
        items={shown}
        title={week.length ? 'This week' : 'Next 30 days'}
        more={list.length - shown.length}
      />
    );
  }

  if (point.id === 'opportunity' && results.overall !== null && results.potential !== null && results.potential > results.overall) {
    return (
      <div className={panel}>
        <div className="flex items-baseline justify-between text-[14px] text-ink-2">
          <span>
            Today <span className="font-semibold text-ink">{results.overall}</span>
          </span>
          <span>
            Within reach <span className="font-semibold text-ink">{results.potential}</span>
          </span>
        </div>
        <div className="mt-3">
          <MiniMeter score={results.overall} potential={results.potential} />
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2" aria-label="Legend">
          <li className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-data" /> Your score today
          </li>
          <li className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-data/35" /> Every area you answered at its target
          </li>
        </ul>
      </div>
    );
  }
  return null;
}

// ── Key point ───────────────────────────────────────────────
export function PointSlide({ point, n, total, results }: { point: KeyPoint; n: number; total: number; results: Results }) {
  const style = kpStyle(point);
  const visual = PointVisual({ point, results });
  return (
    <div
      className={clsx(
        'grid min-h-full w-full items-center gap-[clamp(20px,4cqw,64px)]',
        visual && 'min-[900px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span aria-hidden="true" className={clsx('grid h-10 w-10 place-items-center rounded-xl', style.chip)}>
            <Icon name={point.icon} className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="text-[15px] font-semibold text-ink-2 sm:text-[17px]">
            <span className="tabular-nums text-muted">
              {n} / {total}
            </span>
            <span aria-hidden="true" className="mx-2 text-line-strong">
              ·
            </span>
            {point.label}
          </span>
          <KeyPointChip point={point} sections={results.sections} size="lg" />
        </div>
        <p
          className="font-display mt-[clamp(14px,3.5cqh,36px)] text-balance font-medium leading-[1.02] tracking-[-0.025em] text-ink"
          style={{ fontSize: BIG_SIZE[bigScale(point.big)] }}
        >
          {point.big}
        </p>
        <p className="mt-[clamp(12px,3cqh,32px)] max-w-[44rem] font-semibold leading-snug text-ink" style={{ fontSize: HEADLINE }}>
          {point.headline}
        </p>
        <p className="mt-[clamp(8px,1.6cqh,16px)] max-w-[46rem] leading-relaxed text-ink-2" style={{ fontSize: DETAIL }}>
          {point.detail}
        </p>
      </div>
      {visual && <div className="flex justify-center min-[900px]:justify-end">{visual}</div>}
    </div>
  );
}

// ── Plan ────────────────────────────────────────────────────
const PLAN_COLUMNS: { key: keyof Results['actionPlan']; title: string; Icon: LucideIcon }[] = [
  { key: 'week', title: 'This week', Icon: Zap },
  { key: 'month', title: 'Next 30 days', Icon: CalendarDays },
  { key: 'quarter', title: 'Next 90 days', Icon: CalendarClock },
];
const PER_COLUMN = 2;

function PlanItem({ item }: { item: ActionItem }) {
  return (
    <li className="border-t border-line pt-3 first:border-t-0 first:pt-0">
      <p className="leading-snug text-ink" style={{ fontSize: 'clamp(15px, min(1.3cqw, 2.5cqh), 20px)' }}>
        {item.fix}
      </p>
      <p className="mt-1 text-[12.5px] text-muted">{item.sectionTitle}</p>
    </li>
  );
}

export function PlanSlide({ results }: { results: Results }) {
  return (
    <div className="flex min-h-full w-full flex-col justify-center">
      <Eyebrow>Your plan</Eyebrow>
      <h2
        className="font-display mt-3 font-medium leading-[1.05] tracking-[-0.02em] text-ink"
        style={{ fontSize: 'clamp(30px, min(4.4cqw, 7.5cqh), 68px)' }}
      >
        Start small. Keep going.
      </h2>
      <div className="mt-[clamp(14px,3.2cqh,36px)] grid gap-3 md:grid-cols-3 md:gap-4">
        {PLAN_COLUMNS.map((col) => {
          const items = results.actionPlan[col.key];
          const extra = items.length - PER_COLUMN;
          return (
            <section key={col.key} className="rounded-[22px] border border-line bg-card p-[clamp(16px,2cqw,28px)] shadow-card">
              <h3 className="font-display flex items-center gap-2 text-ink" style={{ fontSize: 'clamp(19px, min(2cqw, 3.6cqh), 28px)' }}>
                <col.Icon className="h-5 w-5 text-accent-ink" aria-hidden="true" />
                {col.title}
              </h3>
              {items.length ? (
                <ul className="mt-3 space-y-3">
                  {items.slice(0, PER_COLUMN).map((item) => (
                    <PlanItem key={`${item.section}:${item.title}`} item={item} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[15px] text-muted">Nothing urgent here.</p>
              )}
              {extra > 0 && <p className="mt-3 text-[13px] font-medium text-muted">+ {extra} more in the full report</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── How we help ─────────────────────────────────────────────
export function HelpSlide({ results }: { results: Results }) {
  const services = results.services;
  return (
    <div className="flex min-h-full w-full flex-col justify-center">
      <Eyebrow>How {BRAND.company} helps</Eyebrow>
      <h2
        className="font-display mt-3 font-medium leading-[1.05] tracking-[-0.02em] text-ink"
        style={{ fontSize: 'clamp(30px, min(4.4cqw, 7.5cqh), 68px)' }}
      >
        What would close these gaps fastest
      </h2>
      <div className={clsx('mt-[clamp(14px,3.2cqh,36px)] grid gap-3 md:gap-4', services.length > 1 && 'md:grid-cols-2', services.length > 2 && 'lg:grid-cols-3')}>
        {services.map((rec, i) => {
          const svc = BRAND.services[rec.id];
          return (
            <section
              key={rec.id}
              className={clsx(
                'rounded-[22px] border p-[clamp(16px,2cqw,28px)] shadow-card',
                i === 0 ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink',
              )}
            >
              <h3 className="font-display flex items-center gap-2.5" style={{ fontSize: 'clamp(20px, min(2.2cqw, 3.8cqh), 30px)' }}>
                <Icon name={svc.icon} className={clsx('h-6 w-6', i === 0 ? 'text-accent-light' : 'text-brand')} />
                {svc.long}
              </h3>
              <p className={clsx('mt-1', i === 0 ? 'text-white/75' : 'text-muted')} style={{ fontSize: DETAIL }}>
                {serviceImpact(rec.items)}
              </p>
              <ul className="mt-3 space-y-2" style={{ fontSize: PANEL_TEXT }}>
                {rec.items.slice(0, 3).map((it) => (
                  <li key={it.questionId} className="flex gap-2 leading-snug">
                    <span aria-hidden="true" className={i === 0 ? 'text-accent-light' : 'text-brand'}>•</span>
                    {it.title}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Contact ─────────────────────────────────────────────────
export function ContactSlide({ businessName }: { businessName: string }) {
  return (
    <div className="flex min-h-full w-full flex-col justify-center">
      <Eyebrow>Next step</Eyebrow>
      <h2
        className="font-display mt-3 max-w-4xl text-balance font-medium leading-[1.05] tracking-[-0.02em] text-ink"
        style={{ fontSize: 'clamp(34px, min(6cqw, 10cqh), 92px)' }}
      >
        {BRAND.contact.heading}
      </h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-2" style={{ fontSize: HEADLINE }}>
        {BRAND.contact.body}
      </p>
      <div className="mt-[clamp(20px,5cqh,48px)]">
        <ContactButtons links={contactLinks(businessName)} size="lg" />
      </div>
    </div>
  );
}

/** Renders any slide's content. Used by the audience screen and the presenter window's previews. */
export function SlideContent({ slide, results, source }: { slide: Slide; results: Results; source: ReportSource }) {
  if (slide.kind === 'title') return <TitleSlide results={results} source={source} />;
  if (slide.kind === 'point')
    return <PointSlide point={slide.point} n={slide.n} total={results.keyPoints.length} results={results} />;
  if (slide.kind === 'plan') return <PlanSlide results={results} />;
  if (slide.kind === 'help') return <HelpSlide results={results} />;
  return <ContactSlide businessName={results.businessName} />;
}
