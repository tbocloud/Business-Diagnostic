import { ArrowRight, FileQuestion } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export function EmptyState({ title, body, cta }: { title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:py-28">
      <span
        aria-hidden="true"
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-line bg-card text-brand shadow-card"
      >
        <FileQuestion className="h-7 w-7" strokeWidth={1.5} />
      </span>
      <h1 className="font-display mt-6 text-[30px] font-medium leading-tight text-ink sm:text-[38px]">{title}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{body}</p>
      <ButtonLink href={cta.href} size="lg" className="mt-8">
        {cta.label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}

export const INVALID_LINK = {
  title: 'This report link looks incomplete',
  body: 'Part of the link may have been cut off when it was copied. Ask for the link again, or run your own free check — it takes about 10 minutes.',
  cta: { href: '/check', label: 'Start your free check' },
};

export function emptyCopy(inProgress: boolean) {
  return {
    title: 'No report here yet',
    body: inProgress
      ? 'Your check-up isn’t finished yet. Pick up where you left off — your answers are saved on this device.'
      : 'Answer a few short sections about your business and your report will appear here, with your real gaps, strengths and next steps.',
    cta: { href: '/check', label: inProgress ? 'Resume your check' : 'Start your free check' },
  };
}
