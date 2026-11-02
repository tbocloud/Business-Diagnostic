import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Slide } from './model';

export function DeckControls({
  slides,
  index,
  go,
  onDone,
  doneLabel = 'Back to report',
}: {
  slides: Slide[];
  index: number;
  go: (i: number) => void;
  onDone: () => void;
  doneLabel?: string;
}) {
  const last = slides.length - 1;
  return (
    <nav aria-label="Slides" className="no-print flex h-16 shrink-0 items-center gap-2 border-t border-line/80 px-2 sm:h-[72px] sm:px-6">
      <button
        type="button"
        onClick={() => go(index - 1)}
        disabled={index === 0}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl px-2 text-[14px] font-semibold text-ink-2 hover:bg-ink/[0.05] hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent sm:px-3"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        <span className="max-sm:sr-only">Previous</span>
      </button>
      <ol className="flex flex-1 items-center justify-center">
        {slides.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}: ${s.label}`}
              aria-current={i === index ? 'step' : undefined}
              className="group grid h-11 w-7 place-items-center sm:w-9"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'block h-2 rounded-full transition-all duration-300',
                  i === index ? 'w-6 bg-accent sm:w-7' : i < index ? 'w-2 bg-brand' : 'w-2 bg-line-strong group-hover:bg-ink-2/50',
                )}
              />
            </button>
          </li>
        ))}
      </ol>
      {index < last ? (
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-brand px-3 text-[14px] font-semibold text-white hover:bg-brand-deep sm:px-4"
        >
          <span className="max-sm:sr-only">Next</span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-brand px-3 text-[14px] font-semibold text-white hover:bg-brand-deep sm:px-4"
        >
          <span className="max-sm:hidden">{doneLabel}</span>
          <span className="sm:hidden">Done</span>
        </button>
      )}
    </nav>
  );
}

/** "Say" / "Ask them" — presenter-only. Never printed. */
export function NotesBody({ slide, large }: { slide: Slide; large?: boolean }) {
  const text = large ? 'text-[16px] leading-relaxed sm:text-[17px]' : 'text-[14px] leading-relaxed sm:text-[15px]';
  return (
    <>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-light">Say</p>
        <p className={clsx('mt-1 text-white/90', text)}>{slide.say}</p>
      </div>
      {slide.ask && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-light">Ask them</p>
          <p className={clsx('mt-1 text-white/90', text)}>“{slide.ask}”</p>
        </div>
      )}
    </>
  );
}
