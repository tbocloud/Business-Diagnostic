'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, emptyCopy, INVALID_LINK } from '@/components/results/EmptyState';
import { useReportData } from '@/components/results/useReportData';
import { Logo } from '@/components/ui/Logo';
import { AudienceView } from './AudienceView';
import { buildSlides } from './model';
import { PresenterView } from './PresenterView';

/**
 * /results/review            → the audience screen (what the owner sees)
 * /results/review?presenter=1 → the BDE's presenter window, opened from the audience screen
 * Both read the same data (saved answers, or the #r= share hash) and stay on the same slide.
 */
export function ReviewApp() {
  const data = useReportData();
  const router = useRouter();
  const [mode, setMode] = useState<'audience' | 'presenter' | null>(null);

  useEffect(() => {
    setMode(new URLSearchParams(window.location.search).get('presenter') === '1' ? 'presenter' : 'audience');
  }, []);

  const ready = data.status === 'ready' ? data : null;
  const slides = useMemo(() => (ready ? buildSlides(ready.results) : []), [ready]);
  const hash = ready?.hash ?? '';
  const reportKey = ready ? `${ready.results.businessName}|${ready.source.completedAt ?? ''}|${hash.length}` : '';

  const exitToReport = useCallback(() => router.push(`/results${hash}`), [router, hash]);
  const closePresenter = useCallback(() => {
    window.close();
    // Only script-opened windows can close themselves; otherwise fall back to the audience screen.
    setTimeout(() => {
      if (!window.closed) router.push(`/results/review${hash}`);
    }, 150);
  }, [router, hash]);

  if (data.status === 'loading' || mode === null) {
    return (
      <div aria-busy="true" className="fixed inset-0 grid place-items-center text-[14px] text-muted">
        Loading the review…
      </div>
    );
  }

  if (!ready || !ready.results.keyPoints.length) {
    const copy =
      data.status === 'invalid' ? INVALID_LINK : emptyCopy(data.status === 'empty' ? data.inProgress : true);
    return (
      <div className="min-h-dvh">
        <header className="border-b border-line">
          <div className="mx-auto flex h-16 max-w-report items-center px-4 sm:px-6">
            <Logo compact />
          </div>
        </header>
        <main id="main">
          <EmptyState {...copy} />
        </main>
      </div>
    );
  }

  return mode === 'presenter' ? (
    <PresenterView
      results={ready.results}
      source={ready.source}
      slides={slides}
      reportKey={reportKey}
      onClose={closePresenter}
    />
  ) : (
    <AudienceView
      results={ready.results}
      source={ready.source}
      slides={slides}
      reportKey={reportKey}
      presenterUrl={`/results/review?presenter=1${hash}`}
      onExit={exitToReport}
    />
  );
}
