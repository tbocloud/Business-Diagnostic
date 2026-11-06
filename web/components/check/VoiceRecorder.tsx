'use client';

import clsx from 'clsx';
import { CheckCircle2, Loader2, Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, openApi } from '@/lib/api';
import type { OpenSignals } from '@/lib/types';

const MAX_SECONDS = 180;
/** What MediaRecorder can produce, best first (Chrome/Firefox: webm or ogg; Safari: mp4). */
const FORMATS = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
];

type State =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'saving' }
  | { kind: 'failed'; message: string; retry?: () => void };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function canRecord(): boolean {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

/** Where a check keeps its voice note: Stage 1, Stage 2 and the ERP check each have their own. */
export interface VoiceBinding {
  voice?: { seconds: number };
  setVoice: (voice: { seconds: number } | undefined) => void;
  /** The check's saved record (id + token), saving it first if needed. */
  ensure: () => Promise<{ id: number; token: string } | null>;
  /** The tags the server found in it (Stage 1's report uses them). */
  onSignals?: (signals: OpenSignals) => void;
}

/**
 * "Record a voice note" for the last step — for clients who'd rather say it than type it. The
 * recording goes straight to the server and from there to the CRM record, where the team listens
 * to it (the server also writes it down and summarises it for them; the client never sees that).
 */
export function VoiceRecorder({ voice, setVoice, ensure, onSignals }: VoiceBinding) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  /** False once the client has left the step: a recording cut short that way is thrown away, not sent. */
  const live = useRef(true);

  useEffect(() => setSupported(canRecord()), []);
  // Free the microphone if the client leaves the step mid-recording.
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // The timer, and the automatic stop at the limit.
  useEffect(() => {
    if (state.kind !== 'recording') return;
    const tick = setInterval(() => {
      const s = (Date.now() - state.startedAt) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS) recorder.current?.stop();
    }, 250);
    return () => clearInterval(tick);
  }, [state]);

  const send = async (audio: Blob, ext: string, seconds: number) => {
    setState({ kind: 'saving' });
    try {
      const saved = await ensure();
      if (!saved) throw new ApiError('We couldn’t reach our server just now.', 0);
      const res = await openApi.voice({ submissionId: saved.id, token: saved.token, audio, fileName: `voice-note.${ext}`, seconds });
      setVoice({ seconds: Math.round(seconds) });
      onSignals?.(res.signals);
      setState({ kind: 'idle' });
    } catch (e) {
      setState({
        kind: 'failed',
        message: e instanceof ApiError ? e.message : 'The voice note didn’t save.',
        retry: () => void send(audio, ext, seconds),
      });
    }
  };

  const start = async () => {
    setState({ kind: 'starting' });
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f.mime));
      const rec = new MediaRecorder(media, format ? { mimeType: format.mime, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (!live.current) return;
        const seconds = Math.min(MAX_SECONDS, (Date.now() - startedAt) / 1000);
        if (seconds < 1.5 || chunks.length === 0) {
          setState({ kind: 'failed', message: 'That was too short to hear — press record and speak for a few seconds.' });
          return;
        }
        const type = rec.mimeType || format?.mime || 'audio/webm';
        const audio = new Blob(chunks, { type });
        setPreview(URL.createObjectURL(audio));
        void send(audio, type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm', seconds);
      };
      recorder.current = rec;
      rec.start(1000);
      setElapsed(0);
      setState({ kind: 'recording', startedAt });
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      const blocked = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setState({
        kind: 'failed',
        message: blocked
          ? 'Your browser didn’t allow the microphone. Allow it for this site, or type your note instead.'
          : 'We couldn’t find a microphone. You can type your note instead.',
      });
    }
  };

  const remove = async () => {
    const saved = await ensure();
    if (!saved) return setState({ kind: 'failed', message: 'We couldn’t reach our server just now — try again in a moment.' });
    try {
      const res = await openApi.removeVoice({ submissionId: saved.id, token: saved.token });
      setVoice(undefined);
      onSignals?.(res.signals);
      setPreview(null);
      setState({ kind: 'idle' });
    } catch (e) {
      setState({ kind: 'failed', message: e instanceof ApiError ? e.message : 'Couldn’t remove the voice note.' });
    }
  };

  if (!supported) return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      {state.kind === 'recording' ? (
        <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-risk-ink">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-risk" aria-hidden="true" />
            Recording {clock(elapsed)}
          </span>
          <span className="text-[12.5px] text-muted">up to {clock(MAX_SECONDS)}</span>
          <Button onClick={() => recorder.current?.stop()} className="ml-auto">
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Stop
          </Button>
        </div>
      ) : state.kind === 'saving' || state.kind === 'starting' ? (
        <p className="inline-flex items-center gap-2 text-[14px] text-ink-2" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {state.kind === 'starting' ? 'Opening the microphone…' : 'Saving your voice note…'}
        </p>
      ) : voice ? (
        <div className="space-y-2.5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ok-ink">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Voice note added ({clock(voice.seconds)})
            </span>
            <span className="text-[13px] text-ink-2">Our team will listen to it — no need to type it as well.</span>
          </p>
          {preview && <audio controls src={preview} className="h-10 w-full max-w-md" />}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void start()} className="!min-h-[36px] !px-3 !text-[13px]">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Record again
            </Button>
            <Button variant="quiet" onClick={() => void remove()} className="!min-h-[36px] !px-3 !text-[13px]">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="secondary" onClick={() => void start()}>
            <Mic className="h-4 w-4" aria-hidden="true" />
            Record a voice note
          </Button>
          <span className="text-[13px] text-ink-2">Easier to say it? Record instead of typing — any language, up to 3 minutes.</span>
        </div>
      )}
      {state.kind === 'failed' && (
        <p role="alert" className={clsx('mt-2.5 text-[13px] text-risk-ink')}>
          {state.message}{' '}
          {state.retry && (
            <button type="button" onClick={state.retry} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
