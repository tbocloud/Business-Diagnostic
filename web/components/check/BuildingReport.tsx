'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Checking each area against the target for your stage…',
  'Looking for the real gap…',
  'Writing your action plan…',
];

/** A short, friendly pause before the report — then `onDone`. */
export function BuildingReport({ businessName, onDone }: { businessName: string; onDone: () => void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const rotate = setInterval(() => setI((n) => Math.min(n + 1, MESSAGES.length - 1)), 640);
    const done = setTimeout(onDone, 1900);
    return () => {
      clearInterval(rotate);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className="grid min-h-[60vh] place-items-center py-12 text-center" role="status" aria-live="polite">
      <div className="animate-rise">
        {/* A report sheet being "written" */}
        <div className="relative mx-auto h-[150px] w-[118px] rotate-[-3deg] rounded-xl border border-line bg-card p-3.5 shadow-sheet">
          <div className="h-2 w-10 rounded-full bg-brand" />
          <div className="mt-3 grid h-12 w-12 place-items-center rounded-full border-[5px] border-data-track">
            <div className="h-12 w-12 animate-spin rounded-full border-[5px] border-transparent border-t-data [animation-duration:1.4s]" />
          </div>
          {[70, 88, 54, 76].map((w, n) => (
            <div key={n} className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full origin-left animate-rise rounded-full bg-line-strong"
                style={{ width: `${w}%`, animationDelay: `${n * 220}ms` }}
              />
            </div>
          ))}
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border-[3px] border-paper bg-accent" />
        </div>
        <h1 className="font-display mt-8 text-[26px] font-medium text-ink sm:text-[30px]">Building your report…</h1>
        <p className="mt-2 text-[14px] font-medium text-muted">{businessName}</p>
        <p key={i} className="mt-4 min-h-[1.6em] animate-fade text-[15px] text-ink-2">
          {MESSAGES[i]}
        </p>
      </div>
    </div>
  );
}
