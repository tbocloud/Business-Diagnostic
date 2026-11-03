import { Clock, Lock, SkipForward, UserRoundX } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { LandingActions } from '@/components/landing/LandingActions';
import { SamplePreview } from '@/components/landing/SamplePreview';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { BRAND } from '@/lib/brand';
import { EMPTY_PROFILE, fill } from '@/lib/profile';
import { SECTIONS } from '@/lib/sections';

const REASSURANCE = [
  { Icon: Clock, text: 'About 10 minutes' },
  { Icon: UserRoundX, text: 'No sign-up' },
  { Icon: SkipForward, text: 'Skip anything you like' },
  { Icon: Lock, text: 'Private — seen only by our team' },
];

const STEPS = [
  {
    title: 'Tell us about your business',
    body: 'Your industry, stage and team size — so the questions and targets fit you. All optional.',
  },
  {
    title: `Answer ${SECTIONS.length} short sections`,
    body: 'Each section is one short page. Pick the closest answer, type your own with “Other”, or skip a question — or the whole section.',
  },
  {
    title: 'See your real gaps, strengths and next steps',
    body: 'A clear report: where you stand, the real gap behind your headache, and what to do this week.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[72px] max-w-[78rem] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <p className="hidden text-[13px] font-medium text-ink-2 md:block">Free · For owners of small and growing businesses</p>
        </div>
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-10%] top-[-20%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(var(--accent)/0.16),transparent)]"
          />
          <div className="relative mx-auto grid max-w-[78rem] items-center gap-14 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12 lg:pb-24 lg:pt-20">
            <div className="animate-rise">
              <p className="eyebrow flex items-center gap-2">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />A guided check-up for your business
              </p>
              <h1 className="font-display mt-5 text-balance text-[42px] font-medium leading-[1.02] tracking-[-0.03em] text-ink sm:text-[58px] lg:text-[72px]">
                See what’s <em className="font-display-italic relative isolate whitespace-nowrap text-brand">really<span aria-hidden="true" className="absolute inset-x-0 bottom-[0.06em] -z-10 h-[0.22em] rounded-full bg-accent/45" /></em>{' '}
                holding your business back
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">{BRAND.tagline}</p>
              <div className="mt-8">
                <LandingActions />
              </div>
              <ul className="mt-9 grid max-w-lg grid-cols-1 gap-x-6 gap-y-3 border-t border-line pt-6 min-[400px]:grid-cols-2" aria-label="What to expect">
                {REASSURANCE.map(({ Icon: I, text }) => (
                  <li key={text} className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
                    <I className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-rise [animation-delay:150ms]">
              <SamplePreview />
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────── */}
        <section aria-labelledby="how-title" className="border-y border-line bg-paper-deep/50">
          <div className="mx-auto max-w-[78rem] px-4 py-16 sm:px-6 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
              <div>
                <p className="eyebrow">How it works</p>
                <h2 id="how-title" className="font-display mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
                  Like a check-up with a good advisor — minus the jargon.
                </h2>
              </div>
              <ol className="grid gap-8 sm:grid-cols-3 sm:gap-0">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="sm:border-l sm:border-line-strong sm:px-6 sm:first:border-l-0 sm:first:pl-0">
                    <span aria-hidden="true" className="font-display block text-[56px] font-light leading-none text-accent-ink/80">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-[17px] font-semibold leading-snug text-ink">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── What we look at ───────────────────────────── */}
        <section aria-labelledby="areas-title">
          <div className="mx-auto max-w-[78rem] px-4 py-16 sm:px-6 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="eyebrow">What we look at</p>
                <h2 id="areas-title" className="font-display mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.015em] text-ink sm:text-[40px]">
                  Eight areas, one honest picture
                </h2>
              </div>
              <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">
                Each area is scored out of 100 against a fair target for your stage — a new shop isn’t judged like a ten-year-old one.
              </p>
            </div>
            <ol className="mt-12 grid border-t border-ink/80 md:grid-cols-2 md:gap-x-12">
              {SECTIONS.map((s, i) => (
                <li key={s.id} className="group flex gap-4 border-b border-line py-6 sm:gap-6">
                  <span aria-hidden="true" className="font-display w-8 shrink-0 pt-1 text-[15px] font-medium tabular-nums text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-brand transition-colors group-hover:border-brand/40 group-hover:bg-brand-soft"
                  >
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <h3 className="font-display text-[21px] font-medium leading-snug text-ink">{s.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{fill(s.intro, EMPTY_PROFILE)}</p>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-[28px] bg-brand px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
              <p className="font-display max-w-xl text-[24px] font-medium leading-snug sm:text-[28px]">
                Ten quiet minutes now can save months of guessing.
              </p>
              <ButtonLink href="/check" variant="accent" size="lg" className="shrink-0">
                Start your free check
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[78rem] flex-col gap-2 px-4 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {BRAND.company} · {BRAND.product}
          </p>
          <p>A guide based on your answers — not an audit.</p>
        </div>
      </footer>
    </div>
  );
}
