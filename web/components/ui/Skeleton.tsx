import clsx from 'clsx';

/** A calm placeholder shown while saved progress loads from this device. */
export function PageSkeleton({ variant = 'question' }: { variant?: 'question' | 'report' }) {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-fade">
      <span className="sr-only">Loading your saved progress…</span>
      {variant === 'question' ? (
        <div className="mx-auto w-full max-w-question px-4 py-10 sm:px-6 md:py-16">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-5 h-8 w-11/12" />
          <div className="skeleton mt-3 h-8 w-2/3" />
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx('skeleton h-[60px] w-full rounded-2xl')} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-report px-4 py-10 sm:px-6">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton mt-4 h-10 w-80 max-w-full" />
          <div className="mt-10 grid gap-6 md:grid-cols-[320px_1fr]">
            <div className="skeleton h-64 rounded-3xl" />
            <div className="space-y-3">
              <div className="skeleton h-6 w-1/2" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
