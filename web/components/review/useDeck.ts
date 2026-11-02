'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CHANNEL = 'business-health-check:review';
/** A peer is "connected" while we keep hearing from it. */
const ALIVE_MS = 1500;
const TIMEOUT_MS = 4500;

export type DeckRole = 'audience' | 'presenter';

interface SyncMessage {
  key: string;
  from: string;
  role: DeckRole;
  type: 'hello' | 'goto' | 'alive' | 'bye';
  index?: number;
}

/**
 * Slide index + keyboard-free navigation, synced between the audience screen and the presenter
 * window. Uses BroadcastChannel; falls back to the `storage` event where it isn't available.
 * Whoever opens later says "hello" and adopts the other window's slide.
 */
export function useDeck({ count, reportKey, role }: { count: number; reportKey: string; role: DeckRole }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [peerSeen, setPeerSeen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const last = count - 1;

  const indexRef = useRef(index);
  indexRef.current = index;
  const sendRef = useRef<(m: Pick<SyncMessage, 'type' | 'index'>) => void>(() => {});

  const apply = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(last, i));
      if (next === indexRef.current) return false;
      setDirection(next > indexRef.current ? 'forward' : 'back');
      setIndex(next);
      return true;
    },
    [last],
  );

  const go = useCallback(
    (i: number) => {
      if (apply(i)) sendRef.current({ type: 'goto', index: Math.max(0, Math.min(last, i)) });
    },
    [apply, last],
  );

  useEffect(() => {
    const id = Math.random().toString(36).slice(2);
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

    const send = (m: Pick<SyncMessage, 'type' | 'index'>) => {
      const msg: SyncMessage & { ts: number } = { ...m, key: reportKey, from: id, role, ts: Date.now() };
      if (bc) bc.postMessage(msg);
      else {
        try {
          window.localStorage.setItem(CHANNEL, JSON.stringify(msg));
        } catch {
          /* no channel available — single-window mode still works */
        }
      }
    };
    sendRef.current = send;

    const handle = (msg: SyncMessage | null) => {
      if (!msg || msg.key !== reportKey || msg.from === id) return;
      if (msg.role !== role) setPeerSeen(msg.type === 'bye' ? 0 : Date.now());
      if (msg.type === 'hello') send({ type: 'goto', index: indexRef.current });
      if (msg.type === 'goto' && typeof msg.index === 'number') apply(msg.index);
    };

    if (bc) bc.onmessage = (e: MessageEvent<SyncMessage>) => handle(e.data);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CHANNEL || !e.newValue) return;
      try {
        handle(JSON.parse(e.newValue) as SyncMessage);
      } catch {
        /* ignore malformed */
      }
    };
    if (!bc) window.addEventListener('storage', onStorage);

    send({ type: 'hello' });
    const beat = setInterval(() => {
      send({ type: 'alive' });
      setNow(Date.now());
    }, ALIVE_MS);
    const bye = () => send({ type: 'bye' });
    window.addEventListener('pagehide', bye);

    return () => {
      bye();
      clearInterval(beat);
      window.removeEventListener('pagehide', bye);
      window.removeEventListener('storage', onStorage);
      sendRef.current = () => {};
      bc?.close();
    };
  }, [reportKey, role, apply]);

  const connected = peerSeen > 0 && now - peerSeen < TIMEOUT_MS;
  return { index: Math.min(index, last), direction, go, last, connected };
}

/** Arrow keys, PageUp/PageDown, Home/End, Esc — plus extra keys per view. */
export function useDeckKeys({
  go,
  index,
  last,
  onEscape,
  extra,
}: {
  go: (i: number) => void;
  index: number;
  last: number;
  onEscape: () => void;
  extra?: (key: string) => boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
      else if (e.key === 'Escape') onEscape();
      else if (extra?.(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, last, onEscape, extra]);
}
