'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Answer, Profile } from './types';

// ─────────────────────────────────────────────────────────────
// A small framework for the follow-up checks — Stage 2 (your real numbers) and the ERP
// check. Each is a few sections of questions (numbers, single or multiple choice, every one
// skippable), saved on this device as the client goes, then sent to the server once.
// ─────────────────────────────────────────────────────────────

export type CheckKind = 'deep' | 'erp';
export type FormAnswers = Record<string, Answer>;

export interface FormOption {
  id: string;
  label: string;
  /** 0–100 for scored questions (best → worst); leave out for neutral choices. */
  score?: number;
  /** Multi-select: picking it clears the others ("None of these"). */
  exclusive?: boolean;
}

export interface FormField {
  id: string;
  text: string;
  hint?: string;
  kind: 'number' | 'single' | 'multi';
  /** Number fields. `score`: 0–100 for a figure (scored questions); leave out for neutral ones. */
  number?: { min: number; max: number; step?: number; prefix?: string; unit: string; placeholder?: string; score?: (n: number) => number };
  /** Choices; for number fields, quick alternatives such as "Not sure". */
  options?: FormOption[];
  maxPicks?: number;
  /** Show "Other — type your own" (single / multi). */
  allowOther?: boolean;
  /** Asked only when this returns true (e.g. skip what Stage 1 already told us). */
  show?: (ctx: FormCtx) => boolean;
  /** Scored questions: what the report says (see lib/erp.ts). */
  insight?: {
    /** Headline when the answer reveals a gap. */
    gap: string;
    /** Headline when the answer is good. */
    strength: string;
    /** What the gap costs, in one or two plain sentences. */
    why: string;
    /** How ERPNext closes it. */
    fix: string;
    /** The ERPNext module that closes it. */
    module: string;
    /** Rough hours a month the gap takes, by option id (for "time this costs you"). */
    hours?: Record<string, number>;
    /** Number questions asked in hours a month: the figure itself is the time it takes. */
    hoursFromValue?: boolean;
  };
}

export interface FormSection {
  id: string;
  title: string;
  /** Short label for the rail and charts. */
  short?: string;
  /** The section is asked only when this returns true (e.g. production only for manufacturers). */
  show?: (ctx: FormCtx) => boolean;
  /** lucide-react icon name (see components/Icon.tsx). */
  icon: string;
  intro: string;
  fields: FormField[];
}

/** Contact details for checks that can be taken on their own (the ERP check). */
export interface FormDetails {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
}

export interface FormCtx {
  answers: FormAnswers;
  /** Stage 1 answers on this device, when there are any (Stage 2 doesn't ask them twice). */
  stage1: FormAnswers;
  /** The Stage 1 profile on this device (industry, team size…), when there is one. */
  profile?: Profile;
}

export const EMPTY_DETAILS: FormDetails = { businessName: '', ownerName: '', phone: '', email: '' };

export interface FormState {
  answers: FormAnswers;
  details: FormDetails;
  /** The last step ("Anything else on your mind?"): their note, and a voice note saved on the server. */
  openText: string;
  openVoice?: { seconds: number };
  step: number;
  doneSteps: number[];
  completedAt?: string;
  submissionId?: number;
  submissionToken?: string;
  setAnswer: (id: string, a: Answer) => void;
  skip: (id: string) => void;
  clear: (id: string) => void;
  setDetails: (patch: Partial<FormDetails>) => void;
  setOpenText: (text: string) => void;
  setOpenVoice: (voice: { seconds: number } | undefined) => void;
  goTo: (step: number) => void;
  markDone: (step: number) => void;
  finish: () => void;
  setSubmission: (id: number, token: string) => void;
  reset: () => void;
}

const initial = {
  answers: {} as FormAnswers,
  details: EMPTY_DETAILS,
  openText: '',
  openVoice: undefined as { seconds: number } | undefined,
  step: 0,
  doneSteps: [] as number[],
  completedAt: undefined as string | undefined,
  submissionId: undefined as number | undefined,
  submissionToken: undefined as string | undefined,
};

/** One persisted store per check, so Stage 2 and the ERP check keep their own progress. */
export function createFormStore(key: CheckKind) {
  return create<FormState>()(
    persist(
      (set) => ({
        ...initial,
        setAnswer: (id, a) => set((s) => ({ answers: { ...s.answers, [id]: { ...a, skipped: false } } })),
        skip: (id) => set((s) => ({ answers: { ...s.answers, [id]: { selected: [], skipped: true } } })),
        clear: (id) =>
          set((s) => {
            const answers = { ...s.answers };
            delete answers[id];
            return { answers };
          }),
        setDetails: (patch) => set((s) => ({ details: { ...s.details, ...patch } })),
        setOpenText: (openText) => set({ openText }),
        setOpenVoice: (openVoice) => set({ openVoice }),
        goTo: (step) => set({ step: Math.max(0, step) }),
        markDone: (step) => set((s) => ({ doneSteps: s.doneSteps.includes(step) ? s.doneSteps : [...s.doneSteps, step] })),
        finish: () => set({ completedAt: new Date().toISOString() }),
        setSubmission: (submissionId, submissionToken) => set({ submissionId, submissionToken }),
        reset: () => set({ ...initial, details: { ...EMPTY_DETAILS }, answers: {} }),
      }),
      {
        name: `business-health-check:${key}:v1`,
        // Saves from before the last step have no note yet.
        merge: (saved, current) => ({ ...current, ...(saved as Partial<FormState>), openText: (saved as Partial<FormState>)?.openText ?? '' }),
      },
    ),
  );
}

export const useDeep = createFormStore('deep');
export const useErp = createFormStore('erp');

// ── Reading answers ─────────────────────────────────────────

/** The figure typed for a number field (not skipped), else undefined. */
export function num(answers: FormAnswers, id: string): number | undefined {
  const a = answers[id];
  return a && !a.skipped && typeof a.value === 'number' ? a.value : undefined;
}

/** The option ids picked (empty when skipped). */
export function picked(answers: FormAnswers, id: string): string[] {
  const a = answers[id];
  return a && !a.skipped ? a.selected : [];
}

export function visibleFields(section: FormSection, ctx: FormCtx): FormField[] {
  return section.fields.filter((f) => !f.show || f.show(ctx));
}

export function visibleSections(sections: FormSection[], ctx: FormCtx): FormSection[] {
  return sections.filter((s) => (!s.show || s.show(ctx)) && visibleFields(s, ctx).length > 0);
}

/** ₹ in Indian style: 4,50,000 → "₹4.5 lakh", 1,20,00,000 → "₹1.2 crore", 8,500 → "₹8,500". */
export function rupees(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const short = (x: number) => (Math.round(x * 10) / 10).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  if (abs >= 1e7) return `${sign}₹${short(abs / 1e7)} crore`;
  if (abs >= 1e5) return `${sign}₹${short(abs / 1e5)} lakh`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

/** 0–100 for a scored question's answer: its figure through the bands, or the picked option's score. */
export function fieldScore(f: FormField, a: Answer | undefined): number | null {
  if (!a || a.skipped) return null;
  if (f.kind === 'number' && typeof a.value === 'number') return f.number?.score ? Math.max(0, Math.min(100, Math.round(f.number.score(a.value)))) : null;
  const opt = f.options?.find((o) => a.selected.includes(o.id));
  return opt?.score ?? null;
}

/** The answer as the client would say it: "12 hours a month", or the picked option. */
export function fieldAnswerLabel(f: FormField, a: Answer): string {
  if (f.kind === 'number' && typeof a.value === 'number') {
    const unit = f.number?.unit ?? '';
    return `${f.number?.prefix ?? ''}${a.value.toLocaleString('en-IN')}${unit.startsWith('%') ? unit : ` ${unit}`}`;
  }
  return f.options?.filter((o) => a.selected.includes(o.id)).map((o) => o.label).join(', ') || a.other?.trim() || '';
}
