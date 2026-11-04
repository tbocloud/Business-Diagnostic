'use client';

import { useId, useState } from 'react';
import { openApi } from '@/lib/api';
import { useCheck } from '@/lib/store';
import { ensureSubmission } from '@/lib/submit';
import { FormFooter, FormHeader } from './FormChrome';
import { VoiceRecorder } from './VoiceRecorder';

const NOTE_MAX = 3000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/**
 * Last, optional step: "Anything else on your mind?" The client types a note in their own
 * words and/or records a voice note (written down into the note when the AI is on). Both go
 * to our team (CRM: a short summary, their words, the recording); the report only uses the
 * tags (which areas and services it touches) — it never quotes them.
 */
export function OpenStep({ notice, onBack, onDone }: { notice?: React.ReactNode; onBack: () => void; onDone: () => void }) {
  const id = useId();
  const text = useCheck((s) => s.open.text);
  const setOpen = useCheck((s) => s.setOpen);
  const voice = useCheck((s) => s.open.voice);
  const [saving, setSaving] = useState(false);
  const said = text.trim().length > 0 || !!voice;

  const finish = async () => {
    if (saving) return;
    const note = useCheck.getState().open.text.trim();
    if (note) {
      setSaving(true);
      try {
        // The note is stored against the check-up, so make sure the check-up is saved first.
        const saved = await ensureSubmission();
        if (saved) {
          const res = await withTimeout(openApi.note({ submissionId: saved.id, token: saved.token, text: note }), 20000);
          useCheck.getState().setOpenSignals(res.signals);
        }
      } catch (e) {
        // The note also travels with the check-up itself (submit), so nothing is lost.
        console.warn('Could not send the note on its own:', e);
      } finally {
        setSaving(false);
      }
    }
    onDone();
  };

  return (
    <div className="animate-slide-in">
      {notice}
      <FormHeader
        eyebrow="Last step · optional"
        numeral="09"
        icon="PenLine"
        title="Anything else on your mind?"
        intro="Is something in your business bothering you that we didn’t ask about? Tell us in your own words — type it, or record a voice note. It helps shape your report, and our team reads it so they understand your business properly."
        questionCount={1}
        minutes={2}
        skipLabel="Skip this step"
        skipTitle="Skip this step?"
        skipBody="You’ll go straight to your results. You can come back to it any time."
        onSkipAll={onDone}
      />

      <section className="mt-3 rounded-[18px] border border-line bg-card px-4 py-4 shadow-card sm:px-5 sm:py-5">
        <label htmlFor={id} className="font-display block text-[16px] font-medium text-ink">
          What’s going on?
        </label>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          A few lines is plenty — what happens, how often, and what it costs you. For example: “Dealers pay 60 days late and I spend every
          Saturday chasing them.”
        </p>
        <textarea
          id={id}
          rows={6}
          value={text}
          maxLength={NOTE_MAX}
          onChange={(e) => setOpen({ text: e.target.value })}
          placeholder="Tell us in your own words…"
          className="field mt-3 min-h-[160px] resize-y"
        />
        <p className="mt-1.5 text-right text-[12px] text-muted" aria-live="polite">
          {text.length.toLocaleString('en-IN')} / {NOTE_MAX.toLocaleString('en-IN')}
        </p>
        <VoiceRecorder
          onTranscript={(heard) => {
            // What the voice note said goes into the note, where the client can correct it.
            const current = useCheck.getState().open.text.trim();
            setOpen({ text: (current ? `${current}\n\n${heard}` : heard).slice(0, NOTE_MAX) });
          }}
        />
      </section>

      <FormFooter
        answered={said ? 1 : 0}
        skipped={0}
        total={1}
        onBack={onBack}
        onContinue={() => void finish()}
        continueLabel={saving ? 'Saving…' : 'See my results'}
        note={said ? 'Thank you — our team will read this.' : 'Optional — skip it if there’s nothing to add'}
      />
    </div>
  );
}
