'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isAnswered } from './engine';
import { OPEN_SIGNALS_ID, openSignalsAnswer } from './openSignals';
import { EMPTY_PROFILE } from './profile';
import { questionsFor } from './questions';
import { SECTIONS } from './sections';
import type { Answer, Answers, OpenSignals, Profile, SectionId } from './types';

// Steps: 0 = "About your business" form, 1..SECTIONS.length = one form per section,
// then OPEN_STEP = "Anything else on your mind?" (optional: type a note or talk it through).
export const PROFILE_STEP = 0;
export const LAST_STEP = SECTIONS.length;
export const OPEN_STEP = LAST_STEP + 1;

export interface ChatLine {
  role: 'client' | 'assistant';
  text: string;
}

/** The last, open step. The words stay on this device and go to the team (CRM) — never into the report. */
export interface OpenNote {
  /** How the client chose to tell us; undefined until they pick. */
  mode?: 'type' | 'chat';
  /** Their typed note. */
  text: string;
  /** The chat so far, for showing it again (the server keeps its own copy). */
  chat: ChatLine[];
  /** The assistant wrapped up, or the message limit was reached. */
  chatDone: boolean;
}

const EMPTY_OPEN: OpenNote = { text: '', chat: [], chatDone: false };
export const sectionAtStep = (step: number) => (step >= 1 && step <= LAST_STEP ? SECTIONS[step - 1] : undefined);

interface CheckState {
  profile: Profile;
  answers: Answers;
  /** Which form is showing (see above). */
  step: number;
  /** Section ids the client has finished (saved or skipped). */
  doneSections: SectionId[];
  startedAt?: string;
  completedAt?: string;
  /** Row in the `submissions` table + the secret that lets this browser update it. */
  submissionId?: number;
  submissionToken?: string;
  /** The client already left a phone/email on the results page. */
  contactSaved?: boolean;
  open: OpenNote;
  /** The client finished (or skipped) the last, open step. */
  openDone: boolean;

  setProfile: (patch: Partial<Profile>) => void;
  setAnswer: (questionId: string, answer: Answer) => void;
  skipQuestion: (questionId: string) => void;
  /** Remove an answer or skip, so the question is open again. */
  clearAnswer: (questionId: string) => void;
  /** "Save & continue": anything left unanswered in the section counts as skipped; the section is done. */
  finishSection: (sectionId: SectionId) => void;
  /** "Skip this whole section": every question in it is skipped (answers given there are cleared). */
  skipSection: (sectionId: SectionId) => void;
  goTo: (step: number) => void;
  finish: () => void;
  setSubmission: (id: number, token: string) => void;
  setContactSaved: () => void;
  setOpen: (patch: Partial<OpenNote>) => void;
  addChatLine: (line: ChatLine) => void;
  /** What the open step touches, as tags inside the answers (so every report view uses them). */
  setOpenSignals: (signals: OpenSignals) => void;
  finishOpen: () => void;
  reset: () => void;
}

const initial = {
  profile: EMPTY_PROFILE,
  answers: {} as Answers,
  step: PROFILE_STEP,
  doneSections: [] as SectionId[],
  startedAt: undefined as string | undefined,
  completedAt: undefined as string | undefined,
  submissionId: undefined as number | undefined,
  submissionToken: undefined as string | undefined,
  contactSaved: false,
  open: EMPTY_OPEN,
  openDone: false,
};

const withDone = (done: SectionId[], id: SectionId) => (done.includes(id) ? done : [...done, id]);

/**
 * Mark the section's visible questions as skipped where `shouldSkip` says so.
 * Skipping can change which questions are visible — clearing "We don't really do marketing"
 * reveals "Do you know which marketing works?" — so repeat until nothing new appears.
 */
function markSkipped(sectionId: SectionId, profile: Profile, answers: Answers, shouldSkip: (a: Answer | undefined) => boolean): Answers {
  const next = { ...answers };
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const q of questionsFor(sectionId, { profile, answers: next })) {
      if (shouldSkip(next[q.id])) {
        next[q.id] = { selected: [], skipped: true };
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
}

export const useCheck = create<CheckState>()(
  persist(
    (set, get) => ({
      ...initial,

      setProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch }, startedAt: s.startedAt ?? new Date().toISOString() })),

      setAnswer: (questionId, answer) =>
        set((s) => ({
          answers: { ...s.answers, [questionId]: { ...answer, skipped: false } },
          startedAt: s.startedAt ?? new Date().toISOString(),
        })),

      skipQuestion: (questionId) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: { selected: [], skipped: true } } })),

      clearAnswer: (questionId) =>
        set((s) => {
          const next = { ...s.answers };
          delete next[questionId];
          return { answers: next };
        }),

      finishSection: (sectionId) => {
        const next = markSkipped(sectionId, get().profile, get().answers, (a) => !isAnswered(a));
        set((s) => ({ answers: next, doneSections: withDone(s.doneSections, sectionId) }));
      },

      skipSection: (sectionId) => {
        const next = markSkipped(sectionId, get().profile, get().answers, (a) => !a?.skipped);
        set((s) => ({ answers: next, doneSections: withDone(s.doneSections, sectionId) }));
      },

      goTo: (step) => set({ step: Math.max(0, Math.min(OPEN_STEP, step)) }),

      finish: () => set({ completedAt: new Date().toISOString() }),

      setSubmission: (submissionId, submissionToken) => set({ submissionId, submissionToken }),

      setContactSaved: () => set({ contactSaved: true }),

      setOpen: (patch) => set((s) => ({ open: { ...s.open, ...patch } })),

      addChatLine: (line) => set((s) => ({ open: { ...s.open, chat: [...s.open.chat, line] } })),

      setOpenSignals: (signals) =>
        set((s) => {
          const answers = { ...s.answers };
          if (signals.areas.length || signals.services.length) answers[OPEN_SIGNALS_ID] = openSignalsAnswer(signals);
          else delete answers[OPEN_SIGNALS_ID];
          return { answers };
        }),

      finishOpen: () => set({ openDone: true }),

      reset: () => set({ ...initial, profile: { ...EMPTY_PROFILE, goals: [] }, answers: {}, open: { ...EMPTY_OPEN, chat: [] } }),
    }),
    {
      name: 'business-health-check:v1',
      // Older saves (one-question-per-screen) carried qIndex / phase / profileStep — drop them.
      partialize: (s) => ({
        profile: s.profile,
        answers: s.answers,
        step: s.step,
        doneSections: s.doneSections,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        submissionId: s.submissionId,
        submissionToken: s.submissionToken,
        contactSaved: s.contactSaved,
        open: s.open,
        openDone: s.openDone,
      }),
      // Saves from before the open step have no `open` yet.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<CheckState>;
        return { ...current, ...s, open: { ...EMPTY_OPEN, ...(s.open ?? {}) }, openDone: !!s.openDone };
      },
    },
  ),
);
