import { ArrowRight, Boxes, Calculator } from 'lucide-react';
import Link from 'next/link';

/** After Stage 1: go deeper with real numbers (Stage 2), or check ERP readiness. */
export function NextChecks() {
  return (
    <section aria-labelledby="next-checks" className="no-print">
      <h2 id="next-checks" className="font-display text-[24px] font-medium text-ink sm:text-[28px]">
        Go deeper
      </h2>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        Your Stage 1 answers carry over — nothing is asked twice.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <NextCard
          href="/deep"
          Icon={Calculator}
          eyebrow="Stage 2 · about 8 minutes"
          title="Your real numbers"
          body="Your real profit, the stage you are really at, how many of your customers are good ones — and growth ideas worth money, worked out from your figures."
        />
        <NextCard
          href="/erp"
          Icon={Boxes}
          eyebrow="ERP check · about 5 minutes"
          title="Are you ready for an ERP?"
          body="What you use today, what slows you down, and which ERP modules would help first — with a simple readiness score."
        />
      </div>
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
