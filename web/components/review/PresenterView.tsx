'use client';

import clsx from 'clsx';
import { Timer, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ReportSource } from '@/components/results/useReportData';
import type { Results } from '@/lib/types';
import { DeckControls, NotesBody } from './DeckParts';
import type { Slide } from './model';
import { ScaledSlide } from './ScaledSlide';
import { SlideContent } from './Slides';
import { useDeck, useDeckKeys } from './useDeck';

function useElapsed() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The BDE's own window: current slide, next-slide preview, the Say / Ask notes, counter and controls.
 * Kept in step with the audience screen in both directions.
 */
export function PresenterView({
  results,
  source,
  slides,
  reportKey,
  onClose,
}: {
  results: Results;
  source: ReportSource;
  slides: Slide[];
  reportKey: string;
  onClose: () => void;
}) {
  const { index, go, last, connected } = useDeck({ count: slides.length, reportKey, role: 'presenter' });
  const elapsed = useElapsed();
  const slide = slides[index];
  const next = slides[index + 1];
  const close = useCallback(() => onClose(), [onClose]);
  useDeckKeys({ go, index, last, onEscape: close });

  useEffect(() => {
    document.title = `Presenter · ${results.businessName}`;
  }, [results.businessName]);

  return (
    <div className="no-print flex min-h-dvh flex-col bg-paper lg:h-dvh">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:h-16 sm:px-6">
        <p className="min-w-0 flex-1 truncate text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Presenter view</span> · {results.businessName}
        </p>
        <span
          className={clsx(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold',
            connected ? 'bg-brand-soft text-brand' : 'bg-paper-deep text-ink-2',
          )}
          role="status"
        >
          <span aria-hidden="true" className={clsx('h-2 w-2 rounded-full', connected ? 'bg-data' : 'bg-line-strong')} />
          {connected ? 'Audience screen connected' : 'Audience screen not open'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[14px] tabular-nums text-ink-2" aria-label={`Time elapsed ${elapsed}`}>
          <Timer className="h-4 w-4" aria-hidden="true" />
          {elapsed}
        </span>
        <p className="font-display text-[17px] font-medium tabular-nums text-ink">
          {index + 1} / {slides.length}
        </p>
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-[14px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="max-md:sr-only">Close</span>
        </button>
      </header>

      <main className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-6">
        <section aria-label="Current slide" className="flex min-h-0 flex-col">
          <p className="eyebrow mb-2">Now showing · {slide.label}</p>
          <ScaledSlide label={`Current slide ${index + 1}: ${slide.label}`}>
            <SlideContent slide={slide} results={results} source={source} />
          </ScaledSlide>
        </section>

        <div className="flex min-h-0 flex-col gap-5">
          <section aria-label="Presenter notes" className="rounded-2xl bg-ink p-5 text-white">
            <div className="space-y-4">
              <NotesBody slide={slide} large />
            </div>
          </section>
          <section aria-label="Next slide">
            <p className="eyebrow mb-2">{next ? `Up next · ${next.label}` : 'Last slide'}</p>
            {next ? (
              <div className="opacity-90">
                <ScaledSlide label={`Next slide ${index + 2}: ${next.label}`}>
                  <SlideContent slide={next} results={results} source={source} />
                </ScaledSlide>
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-card p-5 text-[14px] text-ink-2">
                That’s the end of the review. Agree the first action, its owner and a date before you finish.
              </p>
            )}
          </section>
        </div>
      </main>

      <DeckControls slides={slides} index={index} go={go} onDone={close} doneLabel="End review" />
    </div>
  );
}
