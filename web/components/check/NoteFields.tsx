'use client';

import { useId } from 'react';
import { type VoiceBinding, VoiceRecorder } from './VoiceRecorder';

export const NOTE_MAX = 3000;

/**
 * The last step's body, shared by all three checks: a note in the client's own words, or a voice
 * note — whichever is easier. Both go to our team (the CRM record), never into the report text.
 */
export function NoteFields({
  label = 'What’s going on?',
  example,
  text,
  setText,
  voice,
}: {
  label?: string;
  /** One example sentence, so the client sees the kind of thing we mean. */
  example: string;
  text: string;
  setText: (text: string) => void;
  voice: VoiceBinding;
}) {
  const id = useId();
  return (
    <section className="mt-3 rounded-[18px] border border-line bg-card px-4 py-4 shadow-card sm:px-5 sm:py-5">
      <label htmlFor={id} className="font-display block text-[16px] font-medium text-ink">
        {label}
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">A few lines is plenty — what happens, how often, and what it costs you. For example: “{example}”</p>
      <textarea
        id={id}
        rows={5}
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type it here… or record a voice note below"
        className="field mt-3 min-h-[140px] resize-y"
      />
      <p className="mt-1.5 text-right text-[12px] text-muted" aria-live="polite">
        {text.length.toLocaleString('en-IN')} / {NOTE_MAX.toLocaleString('en-IN')}
      </p>
      <VoiceRecorder {...voice} />
    </section>
  );
}
