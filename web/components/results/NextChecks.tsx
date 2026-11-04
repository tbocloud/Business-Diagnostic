import { ArrowRight, Boxes, Calculator, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { Children } from 'react';

type Next = 'health' | 'deep' | 'erp';

const CARDS: Record<Next, { href: string; Icon: typeof Calculator; eyebrow: string; title: string; body: string }> = {
  health: {
    href: '/check',
    Icon: Stethoscope,
    eyebrow: 'Business Health Check · about 10 minutes',
    title: 'The whole business',
    body: 'Sales, marketing, customers, operations, money, team and technology — your score in each, the real gap, and a 7 / 30 / 90-day plan.',
  },
  deep: {
    href: '/deep',
    Icon: Calculator,
    eyebrow: 'Stage 2 · about 8 minutes',
    title: 'Your real numbers',
    body: 'Your real profit, the stage you are really at, how many of your customers are good ones — and growth ideas worth money, worked out from your figures.',
  },
  erp: {
    href: '/erp',
    Icon: Boxes,
    eyebrow: 'ERP check · about 6 minutes',
    title: 'Find your ERP gaps',
    body: 'Where your current system leaves work to people — accounts, stock, billing, purchase, payroll — the hours it costs, and what ERPNext fixes first.',
  },
};

/** The other checks: after Stage 1, Stage 2 and the ERP check; after those, whichever is left. */
export function NextChecks({
  show = ['deep', 'erp'],
  title = 'Go deeper',
  lead = 'Your Stage 1 answers carry over — nothing is asked twice.',
  children,
}: {
  show?: Next[];
  title?: string;
  lead?: string;
  /** Links under the cards (e.g. back to the other reports). */
  children?: React.ReactNode;
}) {
  const links = Children.toArray(children);
  if (!show.length && !links.length) return null;
  return (
    <section aria-labelledby="next-checks" className="no-print">
      <h2 id="next-checks" className="font-display text-[24px] font-medium text-ink sm:text-[28px]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{lead}</p>
      {show.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {show.map((id) => (
            <NextCard key={id} {...CARDS[id]} />
          ))}
        </div>
      )}
      {links.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{links}</div>}
    </section>
  );
}

function NextCard({ href, Icon, eyebrow, title, body }: { href: string; Icon: typeof Calculator; eyebrow: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[22px] border border-line bg-card px-5 py-5 shadow-card transition-colors hover:border-brand sm:px-6 sm:py-6"
    >
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
          <Icon className="h-5 w-5" />
        </span>
        <span className="eyebrow text-brand">{eyebrow}</span>
      </span>
      <span className="font-display mt-3 text-[21px] font-medium text-ink">{title}</span>
      <span className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-brand">
        Start
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
