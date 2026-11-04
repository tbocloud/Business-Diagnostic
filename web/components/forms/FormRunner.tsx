'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { ChoiceBlock } from '@/components/check/ChoiceBlock';
import { FormFooter, FormHeader } from '@/components/check/FormChrome';
import { minutesFor, type RailState } from '@/components/check/flow';
import { NoteFields } from '@/components/check/NoteFields';
import { MobileStepper, type RailItem, SectionRail } from '@/components/check/SectionRail';
import { TopBar } from '@/components/check/TopBar';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { openApi } from '@/lib/api';
import { isAnswered } from '@/lib/engine';
import { type FormAnswers, type FormCtx, type FormField, type FormSection, type FormState, visibleFields, visibleSections } from '@/lib/forms';
import type { Profile } from '@/lib/types';

type Store = UseBoundStore<StoreApi<FormState>>;

interface FormRunnerProps {
  sections: FormSection[];
  useStore: Store;
  /** Stage 1 answers on this device (fields can hide what Stage 1 already asked). */
  stage1: FormAnswers;
  /** The Stage 1 profile on this device (industry, team), when there is one. */
  profile?: Profile;
  /** Shown above every step, e.g. "Stage 2". */
  eyebrow: string;
  /** "Anything else on your mind?" — a note or a voice note, after the sections. */
  note?: { title: string; intro: string; example: string };
  /** Save the check now (the note and voice note are stored against it); id + token, or null. */
  ensureSaved: () => Promise<{ id: number; token: string } | null>;
  /** A last step asking for the business and contact details (checks taken on their own). */
  details?: { title: string; intro: string };
  /** Save to the server; resolves when done (failures are the caller's to swallow). */
  onSubmit: () => Promise<void>;
  resultsHref: string;
}

/** One step per section, then the note step and the details step — every question skippable, like Stage 1. */
export function FormRunner({ sections: allSections, useStore, stage1, profile, eyebrow, note, ensureSaved, details, onSubmit, resultsHref }: FormRunnerProps) {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const answers = useStore((s) => s.answers);
  const step = useStore((s) => s.step);
  const doneSteps = useStore((s) => s.doneSteps);
  const openText = useStore((s) => s.openText);
  const openVoice = useStore((s) => s.openVoice);
  const [saving, setSaving] = useState(false);
  const ctx: FormCtx = { answers, stage1, profile };
  // Sections can come and go with the answers (e.g. production only for manufacturers).
  const sections = visibleSections(allSections, ctx);
  const noteStep = note ? sections.length : -1;
  const detailsStep = details ? sections.length + (note ? 1 : 0) : -1;
  const total = sections.length + (note ? 1 : 0) + (details ? 1 : 0);

  if (!hydrated) {
    return (
      <div className="min-h-dvh">
        <TopBar progress={0} showReportLink={false} />
        <PageSkeleton />
      </div>
    );
  }

  const current = Math.min(step, total - 1);
  const last = current === total - 1;
  const said = !!openText.trim() || !!openVoice;
  const go = (to: number) => {
    useStore.getState().goTo(to);
    window.scrollTo({ top: 0 });
  };
  const next = async () => {
    useStore.getState().markDone(current);
    // Leaving the note step with a note: send it now (its summary goes to the team), best effort.
    const text = useStore.getState().openText.trim();
    if (current === noteStep && text) {
      setSaving(true);
      try {
        const saved = await ensureSaved();
        if (saved) await openApi.note({ submissionId: saved.id, token: saved.token, text });
      } catch (e) {
        console.warn('Could not send the note on its own:', e);
      } finally {
        setSaving(false);
      }
    }
    if (!last) return go(current + 1);
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
    useStore.getState().finish();
    router.push(resultsHref);
  };

  const section = sections[current];
  const progress = Math.min(1, doneSteps.filter((d) => d < total).length / total);
  const stateOf = (i: number, skipped: boolean): RailState =>
    i === current ? 'current' : doneSteps.includes(i) ? (skipped ? 'skipped' : 'done') : 'upcoming';
  const railItems: RailItem[] = [
    ...sections.map((sec, i) => {
      const fields = visibleFields(sec, ctx);
      const answeredHere = fields.filter((f) => isAnswered(answers[f.id])).length;
      return {
        step: i,
        title: sec.title,
        icon: sec.icon,
        state: stateOf(i, fields.every((f) => answers[f.id]?.skipped)),
        detail: i === current ? `${answeredHere} of ${fields.length} answered` : undefined,
      };
    }),
    ...(note ? [{ step: noteStep, title: 'Anything else?', icon: 'PenLine', state: stateOf(noteStep, !said), detail: current === noteStep ? 'Optional' : undefined }] : []),
    ...(details ? [{ step: detailsStep, title: 'Your details', icon: 'Store', state: stateOf(detailsStep, false) }] : []),
  ];
  const sectionFields = section ? visibleFields(section, ctx) : [];

  return (
    <div className="min-h-dvh">
      <TopBar progress={progress} showReportLink={false} />
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-16">
        <aside className="hidden py-10 lg:block">
          <div className="sticky top-24">
            <SectionRail items={railItems} onJump={go} />
          </div>
        </aside>
        <main id="main" className="overflow-x-clip pb-4 pt-4 lg:pt-10">
          <div className="mx-auto w-full max-w-question">
            <div className="mb-5 lg:hidden">
              <MobileStepper items={railItems} currentStep={current} onJump={go} />
            </div>
            {section ? (
              <SectionStep
                key={section.id}
                section={section}
                number={current + 1}
                total={total}
                eyebrow={eyebrow}
                ctx={ctx}
                useStore={useStore}
                onSkipAll={() => {
                  const st = useStore.getState();
                  for (const f of sectionFields) if (!isAnswered(st.answers[f.id])) st.skip(f.id);
                  void next();
                }}
              />
            ) : current === noteStep && note ? (
              <div className="animate-slide-in">
                <FormHeader
                  eyebrow={`${eyebrow} · Step ${current + 1} of ${total} · optional`}
                  numeral={String(current + 1).padStart(2, '0')}
                  icon="PenLine"
                  title={note.title}
                  intro={note.intro}
                  questionCount={1}
                  minutes={2}
                  skipLabel="Skip this step"
                  skipTitle="Skip this step?"
                  skipBody="You’ll go straight on. You can come back to it any time."
                  onSkipAll={() => void next()}
                />
                <NoteFields
                  example={note.example}
                  text={openText}
                  setText={(t) => useStore.getState().setOpenText(t)}
                  voice={{ voice: openVoice, setVoice: (v) => useStore.getState().setOpenVoice(v), ensure: ensureSaved }}
                />
              </div>
            ) : (
              details && <DetailsStep {...details} number={current + 1} total={total} eyebrow={eyebrow} useStore={useStore} />
            )}
            <FormFooter
              answered={section ? sectionFields.filter((f) => isAnswered(answers[f.id])).length : current === noteStep ? (said ? 1 : 0) : 1}
              skipped={section ? sectionFields.filter((f) => answers[f.id]?.skipped).length : 0}
              total={section ? sectionFields.length : 1}
              onBack={current > 0 ? () => go(current - 1) : undefined}
              onContinue={() => void next()}
              continueLabel={saving ? 'Saving…' : last ? 'See my report' : 'Save & continue'}
              note={current === noteStep ? 'Optional — skip it if there’s nothing to add' : `Step ${current + 1} of ${total} · skip anything you don’t know`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionStep({
  section,
  number,
  total,
  eyebrow,
  ctx,
  useStore,
  onSkipAll,
}: {
  section: FormSection;
  number: number;
  total: number;
  eyebrow: string;
  ctx: FormCtx;
  useStore: Store;
  onSkipAll: () => void;
}) {
  const fields = visibleFields(section, ctx);
  return (
    <div className="animate-slide-in">
      <FormHeader
        eyebrow={`${eyebrow} · Step ${number} of ${total}`}
        numeral={String(number).padStart(2, '0')}
        icon={section.icon}
        title={section.title}
        intro={section.intro}
        questionCount={fields.length}
        minutes={minutesFor(fields.length)}
        skipLabel="Skip this section"
        skipTitle={`Skip ${section.title}?`}
        skipBody="Your report will simply leave this part out. You can come back to it any time."
        onSkipAll={onSkipAll}
      />
      <div className="mt-3 grid gap-3">
        {fields.map((f, i) => (
          <FieldBlock key={f.id} field={f} number={i + 1} ctx={ctx} useStore={useStore} />
        ))}
      </div>
    </div>
  );
}

function FieldBlock({ field: f, number, ctx, useStore }: { field: FormField; number: number; ctx: FormCtx; useStore: Store }) {
  const { setAnswer, skip, clear } = useStore.getState();
  const answer = ctx.answers[f.id];
  const selected = answer?.selected ?? [];
  const options = f.options ?? [];
  const exclusive = (id: string) => !!options.find((o) => o.id === id)?.exclusive;
  const multi = f.kind === 'multi';
  const full = multi && f.maxPicks !== undefined && selected.filter((s) => !exclusive(s)).length >= f.maxPicks;
  const otherOpen = answer?.other !== undefined;
  const keepOther = otherOpen ? { other: answer?.other ?? '' } : {};

  const toggle = (id: string) => {
    if (!multi) return setAnswer(f.id, { selected: [id] }); // picking an option closes "Other"
    if (selected.includes(id)) return setAnswer(f.id, { selected: selected.filter((s) => s !== id), ...keepOther });
    if (exclusive(id)) return setAnswer(f.id, { selected: [id] });
    setAnswer(f.id, { selected: [...selected.filter((s) => !exclusive(s)), id], ...keepOther });
  };

  return (
    <ChoiceBlock
      number={number}
      title={f.text}
      hint={f.hint}
      tag={multi ? (f.maxPicks ? `Pick up to ${f.maxPicks}` : 'Pick all that apply') : undefined}
      kind={multi ? 'checkbox' : 'radio'}
      options={options.map((o) => ({ id: o.id, label: o.label, disabled: full && !selected.includes(o.id) && !o.exclusive }))}
      selected={f.kind === 'number' && typeof answer?.value === 'number' ? [] : selected}
      onToggle={toggle}
      gridClassName={multi || f.kind === 'number' ? 'sm:grid-cols-2' : undefined}
      figure={
        f.kind === 'number' && f.number
          ? {
              value: answer?.value,
              onChange: (value, typed) => {
                if (value !== undefined) return setAnswer(f.id, { selected: [], value });
                if (typed.trim() === '' && selected.length === 0) return clear(f.id);
                if (typeof answer?.value === 'number') clear(f.id);
              },
              min: f.number.min,
              max: f.number.max,
              step: f.number.step,
              prefix: f.number.prefix,
              unit: f.number.unit,
              placeholder: f.number.placeholder,
              label: f.text,
            }
          : undefined
      }
      other={
        f.allowOther && f.kind !== 'number'
          ? {
              open: otherOpen,
              value: answer?.other ?? '',
              onToggle: () =>
                otherOpen
                  ? setAnswer(f.id, { selected: multi ? selected : [] })
                  : setAnswer(f.id, { selected: multi ? selected.filter((s) => !exclusive(s)) : [], other: '' }),
              onChange: (v) => setAnswer(f.id, { selected: multi ? selected : [], other: v }),
              placeholder: 'Tell us in your own words…',
            }
          : undefined
      }
      answered={isAnswered(answer)}
      skipped={!!answer?.skipped}
      onSkip={() => skip(f.id)}
      onUnskip={() => clear(f.id)}
    />
  );
}

function DetailsStep({ title, intro, number, total, eyebrow, useStore }: { title: string; intro: string; number: number; total: number; eyebrow: string; useStore: Store }) {
  const details = useStore((s) => s.details);
  const setDetails = useStore((s) => s.setDetails);
  const base = useId();
  const field = (key: keyof typeof details, label: string, type: string, placeholder: string, autoComplete: string) => (
    <div>
      <label htmlFor={`${base}-${key}`} className="text-[14px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={`${base}-${key}`}
        type={type}
        autoComplete={autoComplete}
        value={details[key]}
        placeholder={placeholder}
        onChange={(e) => setDetails({ [key]: e.target.value })}
        className="field mt-1.5"
      />
    </div>
  );
  return (
    <div className="animate-slide-in">
      <FormHeader
        eyebrow={`${eyebrow} · Step ${number} of ${total}`}
        numeral={String(number).padStart(2, '0')}
        icon="Store"
        title={title}
        intro={intro}
        questionCount={4}
        minutes={1}
        skipLabel="Skip — see the report without them"
        skipTitle="Skip your details?"
        skipBody="You’ll still get your report. We just won’t be able to send you a plan for it."
        onSkipAll={() => setDetails({ phone: '', email: '' })}
      />
      <div className="mt-3 grid gap-4 rounded-[18px] border border-line bg-card px-4 py-5 shadow-card sm:grid-cols-2 sm:px-5">
        {field('businessName', 'Business name', 'text', 'e.g. Green Leaf Organics', 'organization')}
        {field('ownerName', 'Your name', 'text', 'e.g. Ravi Menon', 'name')}
        {field('phone', 'Phone (WhatsApp)', 'tel', 'e.g. +91 98950 22334', 'tel')}
        {field('email', 'Email', 'email', 'e.g. ravi@business.com', 'email')}
        <p className="text-[12.5px] text-muted sm:col-span-2">All optional. We use them only to send you your plan — never for spam.</p>
      </div>
    </div>
  );
}
