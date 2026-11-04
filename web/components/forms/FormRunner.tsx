'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { ChoiceBlock } from '@/components/check/ChoiceBlock';
import { FormFooter, FormHeader } from '@/components/check/FormChrome';
import { minutesFor } from '@/components/check/flow';
import { TopBar } from '@/components/check/TopBar';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { isAnswered } from '@/lib/engine';
import { type FormAnswers, type FormCtx, type FormField, type FormSection, type FormState, visibleFields } from '@/lib/forms';

interface FormRunnerProps {
  sections: FormSection[];
  useStore: UseBoundStore<StoreApi<FormState>>;
  /** Stage 1 answers on this device (fields can hide what Stage 1 already asked). */
  stage1: FormAnswers;
  /** Shown above every step, e.g. "Stage 2". */
  eyebrow: string;
  /** A last step asking for the business and contact details (checks taken on their own). */
  details?: { title: string; intro: string };
  /** Save to the server; resolves when done (failures are the caller's to swallow). */
  onSubmit: () => Promise<void>;
  resultsHref: string;
}

/** One step per section (plus the details step), every question skippable — like Stage 1. */
export function FormRunner({ sections, useStore, stage1, eyebrow, details, onSubmit, resultsHref }: FormRunnerProps) {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const answers = useStore((s) => s.answers);
  const step = useStore((s) => s.step);
  const doneSteps = useStore((s) => s.doneSteps);
  const [saving, setSaving] = useState(false);
  const total = sections.length + (details ? 1 : 0);
  const ctx: FormCtx = { answers, stage1 };

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
  const go = (to: number) => {
    useStore.getState().goTo(to);
    window.scrollTo({ top: 0 });
  };
  const next = async () => {
    useStore.getState().markDone(current);
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
  const progress = Math.min(1, doneSteps.length / total);

  return (
    <div className="min-h-dvh">
      <TopBar progress={progress} showReportLink={false} />
      <main id="main" className="mx-auto w-full max-w-question px-4 pb-4 pt-6 sm:px-6 lg:pt-10">
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
              const s = useStore.getState();
              for (const f of visibleFields(section, ctx)) if (!isAnswered(s.answers[f.id])) s.skip(f.id);
              void next();
            }}
          />
        ) : (
          details && <DetailsStep {...details} number={current + 1} total={total} eyebrow={eyebrow} useStore={useStore} />
        )}
        <FormFooter
          answered={section ? visibleFields(section, ctx).filter((f) => isAnswered(answers[f.id])).length : 1}
          skipped={section ? visibleFields(section, ctx).filter((f) => answers[f.id]?.skipped).length : 0}
          total={section ? visibleFields(section, ctx).length : 1}
          onBack={current > 0 ? () => go(current - 1) : undefined}
          onContinue={() => void next()}
          continueLabel={saving ? 'Saving…' : last ? 'See my report' : 'Save & continue'}
          note={`Step ${current + 1} of ${total} · skip anything you don’t know`}
        />
      </main>
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
  useStore: UseBoundStore<StoreApi<FormState>>;
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

function FieldBlock({
  field: f,
  number,
  ctx,
  useStore,
}: {
  field: FormField;
  number: number;
  ctx: FormCtx;
  useStore: UseBoundStore<StoreApi<FormState>>;
}) {
  const { setAnswer, skip, clear } = useStore.getState();
  const answer = ctx.answers[f.id];
  const selected = answer?.selected ?? [];
  const options = f.options ?? [];
  const exclusive = (id: string) => !!options.find((o) => o.id === id)?.exclusive;
  const multi = f.kind === 'multi';
  const full = multi && f.maxPicks !== undefined && selected.filter((s) => !exclusive(s)).length >= f.maxPicks;

  const toggle = (id: string) => {
    if (!multi) return setAnswer(f.id, { selected: [id] });
    if (selected.includes(id)) return setAnswer(f.id, { selected: selected.filter((s) => s !== id) });
    if (exclusive(id)) return setAnswer(f.id, { selected: [id] });
    setAnswer(f.id, { selected: [...selected.filter((s) => !exclusive(s)), id] });
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
              ...f.number,
              label: f.text,
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

function DetailsStep({
  title,
  intro,
  number,
  total,
  eyebrow,
  useStore,
}: {
  title: string;
  intro: string;
  number: number;
  total: number;
  eyebrow: string;
  useStore: UseBoundStore<StoreApi<FormState>>;
}) {
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
