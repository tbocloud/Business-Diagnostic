'use client';

import clsx from 'clsx';
import { MonitorUp, NotebookPen, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReportSource } from '@/components/results/useReportData';
import { BRAND } from '@/lib/brand';
import type { Results } from '@/lib/types';
import { DeckControls, NotesBody } from './DeckParts';
import type { Slide } from './model';
import { SlideContent } from './Slides';
import { useDeck, useDeckKeys } from './useDeck';

const NOTES_KEY = 'business-health-check:review-notes';

function readNotesPref(): boolean {
  try {
    return window.sessionStorage.getItem(NOTES_KEY) === '1';
  } catch {
    return false;
  }
}

/** The screen the owner sees. Presenter notes only appear here when no presenter window is connected. */
export function AudienceView({
  results,
  source,
  slides,
  reportKey,
  presenterUrl,
  onExit,
}: {
  results: Results;
  source: ReportSource;
  slides: Slide[];
  reportKey: string;
  presenterUrl: string;
  onExit: () => void;
}) {
  const { index, direction, go, last, connected } = useDeck({ count: slides.length, reportKey, role: 'audience' });
  const [notesPref, setNotesPref] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const popup = useRef<Window | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];
  const showNotes = notesPref && !connected;

  useEffect(() => setNotesPref(readNotesPref()), []);

  const toggleNotes = useCallback(() => {
    if (connected) return; // notes live in the presenter window while it is open
    setNotesPref((on) => {
      try {
        window.sessionStorage.setItem(NOTES_KEY, on ? '0' : '1');
      } catch {
        /* storage may be blocked — the toggle still works for this visit */
      }
      return !on;
    });
  }, [connected]);

  const openPresenter = () => {
    if (popup.current && !popup.current.closed) {
      popup.current.focus();
      return;
    }
    const w = window.open(presenterUrl, 'bhc-presenter', 'popup=yes,width=1200,height=800');
    popup.current = w;
    setBlocked(!w);
  };

  const extraKeys = useCallback(
    (key: string) => {
      if (key === 'n' || key === 'N') {
        toggleNotes();
        return true;
      }
      return false;
    },
    [toggleNotes],
  );
  useDeckKeys({ go, index, last, onEscape: onExit, extra: extraKeys });

  // Presenting shouldn't scroll the page behind.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col print:static print:block">
      {/* ── Top bar ── */}
      <header className="no-print flex h-14 shrink-0 items-center gap-2 border-b border-line/80 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-brand font-display text-[11px] font-semibold tracking-[0.06em] text-white"
        >
          {BRAND.mark}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Review</span>
          <span className="max-md:hidden"> · {results.businessName}</span>
        </p>
        <p className="font-display text-[15px] font-medium tabular-nums text-ink" aria-hidden="true">
          {index + 1} / {slides.length}
        </p>

        {connected ? (
          <button
            type="button"
            onClick={openPresenter}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-soft px-3 text-[14px] font-semibold text-brand hover:bg-brand-soft/70"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-data" />
            <span className="max-sm:sr-only">Presenter view open</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={openPresenter}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-[14px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink max-md:hidden"
            >
              <MonitorUp className="h-4 w-4" aria-hidden="true" />
              Open presenter view
            </button>
            <button
              type="button"
              onClick={toggleNotes}
              aria-pressed={notesPref}
              className={clsx(
                'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-[14px] font-semibold transition-colors',
                notesPref ? 'bg-ink text-white hover:bg-ink/90' : 'text-ink-2 hover:bg-ink/[0.05] hover:text-ink',
              )}
            >
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              <span className="max-lg:sr-only">Presenter notes</span>
              <kbd
                aria-hidden="true"
                className={clsx(
                  'hidden rounded border px-1.5 font-sans text-[11px] font-medium lg:inline',
                  notesPref ? 'border-white/30 text-white/80' : 'border-line-strong text-muted',
                )}
              >
                N
              </kbd>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onExit}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-[14px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="max-lg:sr-only">Close</span>
          <kbd aria-hidden="true" className="hidden rounded border border-line-strong px-1.5 font-sans text-[11px] font-medium text-muted lg:inline">
            Esc
          </kbd>
        </button>
      </header>
      {blocked && (
        <p role="status" className="no-print border-b border-line bg-accent-soft px-4 py-2 text-center text-[13.5px] text-ink">
          Your browser blocked the presenter window. Allow pop-ups for this site, then try again.
        </p>
      )}

      {/* ── Slide stage ── */}
      <section
        aria-roledescription="carousel"
        aria-label={`Review of ${results.businessName}`}
        className="relative min-h-0 flex-1 print:min-h-[90vh]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <p className="sr-only" aria-live="polite">
          Slide {index + 1} of {slides.length}: {slide.label}
        </p>
        <div
          key={index}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
          className={clsx(
            'absolute inset-0 overflow-y-auto overscroll-contain print:static print:overflow-visible',
            direction === 'forward' ? 'animate-slide-in' : 'animate-slide-back',
          )}
          style={{ containerType: 'size' }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[84rem] items-center px-4 py-6 sm:px-10 sm:py-10 lg:px-16">
            <SlideContent slide={slide} results={results} source={source} />
          </div>
        </div>
      </section>

      {/* ── Presenter notes (single-screen use only; never printed) ── */}
      {showNotes && (
        <aside
          aria-label="Presenter notes"
          className="no-print max-h-[38dvh] shrink-0 animate-fade overflow-y-auto border-t border-ink/10 bg-ink px-4 py-3.5 text-white sm:px-10 sm:py-4 lg:px-16"
        >
          <div className="mx-auto grid max-w-[84rem] gap-x-10 gap-y-2.5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <NotesBody slide={slide} />
          </div>
        </aside>
      )}

      <DeckControls slides={slides} index={index} go={go} onDone={onExit} />
    </div>
  );
}
