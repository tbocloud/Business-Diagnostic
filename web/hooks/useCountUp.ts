'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Counts from 0 up to `target` with an ease-out curve. Jumps straight there when motion is reduced. */
export function useCountUp(target: number | null, duration = 1200): number | null {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number | null>(target === null ? null : 0);

  useEffect(() => {
    if (target === null) {
      setValue(null);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF pauses in background tabs; always land on the real number.
    const settle = setTimeout(() => setValue(target), duration + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [target, duration, reduced]);

  return value;
}
