'use client';

import { useEffect, useState } from 'react';
import { useCheck } from '@/lib/store';

/**
 * The store is persisted to localStorage, which the server can't see.
 * Render a neutral skeleton until the client has rehydrated, so the user
 * never sees a flash of the wrong state (or a hydration mismatch).
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCheck.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useCheck.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
