'use client';

import { useEffect, useRef, useState } from 'react';

// Slides are laid out on a fixed virtual 16:10 stage and scaled down to fit — so a preview in the
// presenter window looks exactly like the audience screen, just smaller.
const STAGE_W = 1280;
const STAGE_H = 800;

export function ScaledSlide({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden rounded-2xl border border-line bg-paper shadow-card"
      style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, containerType: 'size' }}
      >
        <div className="flex h-full w-full items-center px-16 py-10">{children}</div>
      </div>
    </div>
  );
}
