'use client';

import clsx from 'clsx';
import { ArrowUp, Loader2, MessagesSquare, PenLine, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ApiError, openApi } from '@/lib/api';
import { type ChatLine, useCheck } from '@/lib/store';
import { syncSubmission } from '@/lib/submit';
import { FormFooter, FormHeader } from './FormChrome';

const NOTE_MAX = 3000;
const MESSAGE_MAX = 800;

type ChatStatus = { state: 'checking' } | { state: 'on'; greeting: string; maxMessages: number } | { state: 'off' };

/** The check-up's id + token, saving it first if needed (the open step is stored against it). */
async function savedSubmission(): Promise<{ id: number; token: string } | null> {
  let { submissionId, submissionToken } = useCheck.getState();
  if (!submissionId || !submissionToken) {
    await syncSubmission();
    ({ submissionId, submissionToken } = useCheck.getState());
  }
  return submissionId && submissionToken ? { id: submissionId, token: submissionToken } : null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/**
 * Last, optional step: "Anything else on your mind?" The client types a note, or talks it
 * through with a short chat that asks one question at a time. Their words go to our team
 * (CRM); the report only uses the tags (areas, services) — it never quotes them.
 */
export function OpenStep({ notice, onBack, onDone }: { notice?: React.ReactNode; onBack: () => void; onDone: () => void }) {
  const open = useCheck((s) => s.open);
  const setOpen = useCheck((s) => s.setOpen);
  const [chat, setChat] = useState<ChatStatus>({ state: 'checking' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The chat and the note are saved against the check-up, so save it now (or refresh it).
    void syncSubmission();
    let live = true;
    openApi
      .status()
      .then((s) => live && setChat(s.chat ? { state: 'on', greeting: s.greeting, maxMessages: s.maxMessages } : { state: 'off' }))
      .catch(() => live && setChat({ state: 'off' }));
    return () => {
      live = false;
    };
  }, []);

  const said = open.text.trim().length > 0 || open.chat.some((l) => l.role === 'client');

  const finish = async () => {
    if (saving) return;
    const { open: current } = useCheck.getState();
    const text = current.text.trim();
    if (current.mode === 'type' && text) {
      setSaving(true);
      try {
        const saved = await savedSubmission();
        if (saved) {
          const res = await withTimeout(openApi.note({ submissionId: saved.id, token: saved.token, text }), 20000);
          useCheck.getState().setOpenSignals(res.signals);
        }
      } catch (e) {
        // The note still travels with the check-up itself (submit), so nothing is lost.
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
        icon="MessagesSquare"
        title="Anything else on your mind?"
        intro="Is something in your business bothering you that we didn’t ask about? Tell us in your own words. It helps shape your report, and our team reads it so they understand your business properly."
        questionCount={1}
        minutes={2}
        skipLabel="Skip this step"
        skipTitle="Skip this step?"
        skipBody="You’ll go straight to your results. You can come back to it any time."
        onSkipAll={onDone}
      />

      <div role="radiogroup" aria-label="How would you like to tell us?" className="mt-3 grid gap-3 sm:grid-cols-2">
        <ModeCard
          Icon={PenLine}
          title="Type it in"
          body="Write it down in your own words and send it with your check-up."
          active={open.mode === 'type'}
          onSelect={() => setOpen({ mode: 'type' })}
        />
        <ModeCard
          Icon={MessagesSquare}
          title="Talk it through"
          body={
            chat.state === 'off'
              ? 'Not available right now — please type it instead.'
              : 'Our assistant asks a few short questions, one at a time, to understand it properly. About 2 minutes.'
          }
          active={open.mode === 'chat'}
          disabled={chat.state !== 'on'}
          onSelect={() => setOpen({ mode: 'chat' })}
        />
      </div>

      {open.mode === 'type' && <NoteBox />}
      {open.mode === 'chat' && chat.state === 'on' && (
        <ChatBox greeting={chat.greeting} maxMessages={chat.maxMessages} onSwitchToType={() => setOpen({ mode: 'type' })} />
      )}

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

function ModeCard({
  Icon,
  title,
  body,
  active,
  disabled,
  onSelect,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={clsx(
        'flex items-start gap-3 rounded-[18px] border px-4 py-4 text-left transition-colors sm:px-5',
        active ? 'border-brand bg-brand-soft/40 shadow-[inset_0_0_0_1px_rgb(var(--brand))]' : 'border-line bg-card shadow-card hover:border-ink-2/40',
        disabled && 'cursor-not-allowed opacity-60 hover:border-line',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', active ? 'bg-brand text-white' : 'bg-paper-deep text-brand')}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span>
        <span className="font-display block text-[16px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">{body}</span>
      </span>
    </button>
  );
}

function NoteBox() {
  const id = useId();
  const text = useCheck((s) => s.open.text);
  const setOpen = useCheck((s) => s.setOpen);
  return (
    <section className="mt-3 animate-fade rounded-[18px] border border-line bg-card px-4 py-4 shadow-card sm:px-5 sm:py-5">
      <label htmlFor={id} className="font-display block text-[16px] font-medium text-ink">
        What’s going on?
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        A few lines is plenty — what happens, and what it costs you. For example: “Dealers pay late and I spend every Saturday chasing them.”
      </p>
      <textarea
        id={id}
        rows={5}
        value={text}
        maxLength={NOTE_MAX}
        onChange={(e) => setOpen({ text: e.target.value })}
        placeholder="Tell us in your own words…"
        className="field mt-3 min-h-[140px] resize-y"
      />
      <p className="mt-1.5 text-right text-[12px] text-muted" aria-live="polite">
        {text.length.toLocaleString('en-IN')} / {NOTE_MAX.toLocaleString('en-IN')}
      </p>
    </section>
  );
}

function Bubble({ role, text }: ChatLine) {
  const mine = role === 'client';
  return (
    <li className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
      <p
        className={clsx(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed',
          mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-paper-deep text-ink',
        )}
      >
        <span className="sr-only">{mine ? 'You: ' : 'Assistant: '}</span>
        {text}
      </p>
    </li>
  );
}

function ChatBox({ greeting, maxMessages, onSwitchToType }: { greeting: string; maxMessages: number; onSwitchToType: () => void }) {
  const inputId = useId();
  const lines = useCheck((s) => s.open.chat);
  const chatDone = useCheck((s) => s.open.chatDone);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const sent = lines.filter((l) => l.role === 'client').length;
  const left = Math.max(0, maxMessages - sent);
  const done = chatDone || left === 0;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lines.length, sending]);

  const send = async () => {
    const message = draft.trim();
    if (!message || sending || done) return;
    setError(null);
    setSending(true);
    const saved = await savedSubmission();
    if (!saved) {
      setSending(false);
      setError('We couldn’t reach our server just now. Try again in a moment, or type it instead.');
      return;
    }
    const store = useCheck.getState();
    store.addChatLine({ role: 'client', text: message });
    setDraft('');
    try {
      const res = await openApi.chat({ submissionId: saved.id, token: saved.token, message });
      const s = useCheck.getState();
      s.addChatLine({ role: 'assistant', text: res.reply });
      s.setOpenSignals(res.signals);
      if (res.done) s.setOpen({ chatDone: true });
    } catch (e) {
      // The server only keeps a message once it has answered it, so take it back and let them resend.
      const s = useCheck.getState();
      s.setOpen({ chat: s.open.chat.slice(0, -1) });
      setDraft(message);
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-label="Chat with our assistant" className="mt-3 animate-fade overflow-hidden rounded-[18px] border border-line bg-card shadow-card">
      <ol ref={listRef} aria-live="polite" className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        <Bubble role="assistant" text={greeting} />
        {lines.map((l, i) => (
          <Bubble key={i} role={l.role} text={l.text} />
        ))}
        {sending && (
          <li className="flex justify-start">
            <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-paper-deep px-3.5 py-2.5 text-[13px] text-ink-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Thinking…
            </span>
          </li>
        )}
      </ol>
      <div className="border-t border-line bg-paper/60 px-3 py-3 sm:px-4">
        {done ? (
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            Thank you — that’s everything we need. Press <strong className="font-semibold text-ink">See my results</strong> when you’re ready.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor={inputId} className="sr-only">
              Your message
            </label>
            <textarea
              id={inputId}
              rows={2}
              value={draft}
              maxLength={MESSAGE_MAX}
              disabled={sending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={sent ? 'Type your answer…' : 'Describe it in your own words…'}
              className="field min-h-[52px] flex-1 resize-none"
            />
            <Button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="shrink-0 !px-3.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </form>
        )}
        {!done && (
          <p className="mt-1.5 text-[12px] text-muted">
            {left} message{left === 1 ? '' : 's'} left · Enter to send · stop any time, what you’ve said is kept
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-risk-ink">
            {error}{' '}
            <button type="button" onClick={onSwitchToType} className="font-semibold underline underline-offset-2">
              Type it instead
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
