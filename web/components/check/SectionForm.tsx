'use client';

import { SkipForward } from 'lucide-react';
import { isAnswered } from '@/lib/engine';
import { fill } from '@/lib/profile';
import { questionsFor } from '@/lib/questions';
import { SECTIONS } from '@/lib/sections';
import { useCheck } from '@/lib/store';
import type { Answer, Answers, Profile, Question, Section } from '@/lib/types';
import { ChoiceBlock } from './ChoiceBlock';
import { FormFooter, FormHeader } from './FormChrome';
import { minutesFor, sectionCounts, sectionWasSkipped } from './flow';

interface SectionFormProps {
  section: Section;
  number: number;
  profile: Profile;
  answers: Answers;
  /** Shown above the form, e.g. "✓ Sales saved — 2 strengths spotted". */
  notice?: React.ReactNode;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
  onSkipSection: () => void;
}

/** All the questions of one section on one page. Every question can be skipped, and so can the whole section. */
export function SectionForm({
  section,
  number,
  profile,
  answers,
  notice,
  continueLabel,
  onBack,
  onContinue,
  onSkipSection,
}: SectionFormProps) {
  const ctx = { profile, answers };
  // Visibility can change as answers change (e.g. "no marketing" hides "which marketing works?").
  const questions = questionsFor(section.id, ctx);
  const counts = sectionCounts(section.id, ctx);
  const wasSkipped = sectionWasSkipped(section.id, ctx);
  const answeredHere = questions.filter((q) => isAnswered(answers[q.id])).length;

  return (
    <div className="animate-slide-in">
      {notice}
      <FormHeader
        eyebrow={`Section ${number} of ${SECTIONS.length}`}
        numeral={String(number).padStart(2, '0')}
        icon={section.icon}
        title={section.title}
        intro={fill(section.intro, profile)}
        questionCount={questions.length}
        minutes={minutesFor(questions.length)}
        note={
          wasSkipped ? (
            <p className="inline-flex items-center gap-2 rounded-xl bg-paper-deep px-3 py-2 text-[14px] text-ink-2">
              <SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />
              You skipped this section. Answer any question below to include it in your report.
            </p>
          ) : undefined
        }
        skipLabel="Skip this whole section"
        skipTitle={`Skip ${section.title}?`}
        skipBody={
          answeredHere > 0
            ? `We’ll leave this area out of your score and clear the ${answeredHere} answer${answeredHere === 1 ? '' : 's'} you gave here.`
            : 'We’ll leave this area out of your score. You can come back to it any time.'
        }
        onSkipAll={onSkipSection}
      />

      <div className="mt-3 grid gap-3">
        {questions.map((q, i) => (
          <QuestionBlock key={q.id} question={q} number={i + 1} answer={answers[q.id]} profile={profile} />
        ))}
      </div>

      <FormFooter
        answered={counts.answered}
        skipped={counts.skipped}
        total={counts.total}
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={continueLabel}
        note={counts.open > 0 ? `${counts.open} unanswered will be skipped` : undefined}
      />
    </div>
  );
}

/** Wires one engine Question to a ChoiceBlock: single/multi select, exclusive options and "Other". */
function QuestionBlock({
  question: q,
  number,
  answer,
  profile,
}: {
  question: Question;
  number: number;
  answer?: Answer;
  profile: Profile;
}) {
  const { setAnswer, skipQuestion, clearAnswer } = useCheck.getState();
  if (q.type === 'number' && q.number) {
    return <NumberQuestion question={q} number={number} answer={answer} profile={profile} />;
  }
  const multi = q.type === 'multi';
  const selected = answer?.selected ?? [];
  const full = multi && q.maxPicks !== undefined && selected.length >= q.maxPicks;
  // An "Other" box is open whenever `other` is present — even while it's still empty.
  const otherOpen = answer?.other !== undefined;
  const otherText = answer?.other ?? '';
  const isExclusive = (id: string) => !!q.options.find((o) => o.id === id)?.exclusive;

  const toggle = (id: string) => {
    if (!multi) return setAnswer(q.id, { selected: [id] }); // picking an option closes "Other"
    if (selected.includes(id)) {
      return setAnswer(q.id, { selected: selected.filter((s) => s !== id), ...(otherOpen ? { other: otherText } : {}) });
    }
    if (isExclusive(id)) return setAnswer(q.id, { selected: [id] }); // "None of these" clears everything, incl. Other
    setAnswer(q.id, {
      selected: [...selected.filter((s) => !isExclusive(s)), id],
      ...(otherOpen ? { other: otherText } : {}),
    });
  };

  const toggleOther = () => {
    if (otherOpen) return setAnswer(q.id, { selected: multi ? selected : [] });
    // Other sits alongside normal options (multi), but never alongside an exclusive "None of these".
    setAnswer(q.id, { selected: multi ? selected.filter((s) => !isExclusive(s)) : [], other: '' });
  };

  const changeOther = (v: string) => setAnswer(q.id, { selected: multi ? selected : [], other: v });

  return (
    <ChoiceBlock
      number={number}
      title={fill(q.text, profile)}
      hint={q.hint ? fill(q.hint, profile) : undefined}
      tag={multi ? (q.maxPicks ? `Pick up to ${q.maxPicks}` : 'Pick all that apply') : undefined}
      kind={multi ? 'checkbox' : 'radio'}
      options={q.options.map((o) => ({
        id: o.id,
        label: fill(o.label, profile),
        // At the pick limit, the rest wait until one is unpicked.
        disabled: full && !selected.includes(o.id),
      }))}
      selected={selected}
      onToggle={toggle}
      gridClassName={multi ? 'sm:grid-cols-2' : undefined}
      other={
        q.allowOther === false
          ? undefined
          : {
              open: otherOpen,
              value: otherText,
              onToggle: toggleOther,
              onChange: changeOther,
              placeholder: multi ? 'Anything else you use? e.g. Excel for stock' : 'Tell us in your own words…',
            }
      }
      answered={isAnswered(answer)}
      skipped={!!answer?.skipped}
      onSkip={() => skipQuestion(q.id)}
      onUnskip={() => clearAnswer(q.id)}
    />
  );
}

/**
 * A number question: a figure box ("₹ [15000] a month") plus quick choices such as "Not sure".
 * Typing a figure clears the quick choice and picking a choice clears the figure — one answer at a time.
 */
function NumberQuestion({
  question: q,
  number,
  answer,
  profile,
}: {
  question: Question;
  number: number;
  answer?: Answer;
  profile: Profile;
}) {
  const { setAnswer, skipQuestion, clearAnswer } = useCheck.getState();
  const spec = q.number!;
  const selected = answer?.selected ?? [];
  const title = fill(q.text, profile);

  return (
    <ChoiceBlock
      number={number}
      title={title}
      hint={q.hint ? fill(q.hint, profile) : undefined}
      kind="radio"
      options={q.options.map((o) => ({ id: o.id, label: fill(o.label, profile) }))}
      selected={typeof answer?.value === 'number' ? [] : selected}
      onToggle={(id) => setAnswer(q.id, { selected: [id] })}
      gridClassName="sm:grid-cols-2"
      figure={{
        value: answer?.value,
        onChange: (value, typed) => {
          if (value !== undefined) return setAnswer(q.id, { selected: [], value });
          // Empty or not a valid figure yet: drop the figure, keep a quick choice if one was picked.
          if (typed.trim() === '' && selected.length === 0) return clearAnswer(q.id);
          if (typeof answer?.value === 'number') clearAnswer(q.id);
        },
        min: spec.min,
        max: spec.max,
        step: spec.step,
        prefix: spec.prefix,
        unit: fill(spec.unit, profile),
        placeholder: spec.placeholder,
        label: title,
      }}
      answered={isAnswered(answer)}
      skipped={!!answer?.skipped}
      onSkip={() => skipQuestion(q.id)}
      onUnskip={() => clearAnswer(q.id)}
    />
  );
}
