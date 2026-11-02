'use client';

import { Eye, Info, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { shareUrl } from '@/lib/share';
import { useCheck } from '@/lib/store';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { ContactCapture } from './ContactCapture';
import { ContactCta } from './ContactCta';
import { EmptyState, emptyCopy, INVALID_LINK } from './EmptyState';
import { ReportBody } from './ReportBody';
import { ReportHeader } from './ReportHeader';
import { useReportData } from './useReportData';

export const FOOTNOTE =
  'This check is a guide based on your answers, not an audit. Targets are guide levels for a business at your stage, not industry statistics.';

export function ResultsApp() {
  const router = useRouter();
  const data = useReportData();

  if (data.status === 'loading') {
    return (
      <Frame>
        <PageSkeleton variant="report" />
      </Frame>
    );
  }
  if (data.status === 'invalid') {
    return (
      <Frame>
        <EmptyState {...INVALID_LINK} />
      </Frame>
    );
  }
  if (data.status === 'empty') {
    return (
      <Frame>
        <EmptyState {...emptyCopy(data.inProgress)} />
      </Frame>
    );
  }

  const { source, results, isShared, hash } = data;

  return (
    <Frame wide>
      {isShared && (
        <Banner Icon={Eye} tone="plain" link={{ href: '/', label: 'Run your own free check' }}>
          <span className="font-semibold text-ink">You’re viewing a shared report.</span> Everything on this page comes from
          the link you opened.
        </Banner>
      )}
      {!isShared && !source.completedAt && (
        <Banner Icon={Info} tone="accent" link={{ href: '/check', label: 'Continue the check' }}>
          Your check-up isn’t finished, so this report only covers what you’ve answered so far.
        </Banner>
      )}

      <ReportHeader
        results={results}
        profile={source.profile}
        completedAt={source.completedAt}
        isShared={isShared}
        reviewHref={results.keyPoints.length ? `/results/review${hash}` : undefined}
        getShareUrl={() => shareUrl(source.profile, source.answers, source.completedAt)}
        onEdit={() => {
          useCheck.getState().goTo(1);
          router.push('/check');
        }}
        onReset={() => {
          useCheck.getState().reset();
          router.push('/check');
        }}
      />

      <ReportBody
        results={results}
        afterRealGap={!isShared ? <ContactCapture businessName={results.businessName} /> : undefined}
        footer={
          <>
            <ContactCta businessName={results.businessName} />
            <p className="no-print border-t border-line pt-6 text-[13px] leading-relaxed text-muted">{FOOTNOTE}</p>
          </>
        }
      />
    </Frame>
  );
}

function Banner({
  Icon,
  tone,
  link,
  children,
}: {
  Icon: LucideIcon;
  tone: 'plain' | 'accent';
  link: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === 'plain'
          ? 'no-print mb-8 flex gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-[14px] text-ink-2'
          : 'no-print mb-8 flex gap-3 rounded-2xl border border-accent/50 bg-accent-soft px-4 py-3 text-[14px] text-ink'
      }
    >
      <Icon className={`mt-[3px] h-4 w-4 shrink-0 ${tone === 'plain' ? 'text-brand' : 'text-accent-ink'}`} aria-hidden="true" />
      {/* Text and link stack on phones, sit side by side from sm up */}
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="leading-relaxed">{children}</p>
        <ButtonLink href={link.href} variant="link" className="mt-1 inline-block text-[14px] font-semibold sm:mt-0 sm:shrink-0">
          {link.label}
        </ButtonLink>
      </div>
    </div>
  );
}

function Frame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-line">
        <div className="mx-auto flex h-16 max-w-report items-center justify-between gap-4 px-4 sm:px-6">
          <Logo compact />
          <span className="text-[13px] text-muted max-sm:hidden">{BRAND.tagline}</span>
        </div>
      </header>
      <main id="main" className={wide ? 'mx-auto max-w-report px-4 pb-20 pt-8 sm:px-6 sm:pt-12' : ''}>
        {children}
      </main>
      <footer className="no-print border-t border-line py-8">
        <div className="mx-auto max-w-report px-4 text-[13px] text-muted sm:px-6">
          © {new Date().getFullYear()} {BRAND.company}. Your answers are shared only with the {BRAND.company} team.
        </div>
      </footer>
    </div>
  );
}
