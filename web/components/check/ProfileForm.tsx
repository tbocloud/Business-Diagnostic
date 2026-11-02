'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useId } from 'react';
import {
  fill,
  GOALS,
  HEADACHES,
  INDUSTRIES,
  LEVELS,
  PROFILE_BLOCKS,
  profileAnsweredCount,
  TEAM_SIZES,
} from '@/lib/profile';
import { useCheck } from '@/lib/store';
import type { Profile, ProfileField } from '@/lib/types';
import { ChoiceBlock } from './ChoiceBlock';
import { FormFooter, FormHeader } from './FormChrome';

const MAX_GOALS = 3;

/** What each profile question clears when it's skipped. */
const CLEAR: Record<ProfileField, Partial<Profile>> = {
  industry: { industry: undefined, industryOther: undefined },
  level: { level: undefined },
  teamSize: { teamSize: undefined },
  headache: { headache: undefined, headacheOther: undefined },
  goals: { goals: [], goalsOther: undefined },
};

/** "About your business" — everything on one page, everything optional. */
export function ProfileForm({ onDone }: { onDone: () => void }) {
  const profile = useCheck((s) => s.profile);
  const setProfile = useCheck((s) => s.setProfile);
  const skippedFields = profile.skipped ?? [];
  const isSkipped = (f: ProfileField) => skippedFields.includes(f);

  /** Set a value and make sure the field is no longer marked as skipped. */
  const answer = (f: ProfileField, patch: Partial<Profile>) =>
    setProfile({ ...patch, skipped: skippedFields.filter((x) => x !== f) });
  const skip = (f: ProfileField) =>
    setProfile({ ...CLEAR[f], skipped: [...skippedFields.filter((x) => x !== f), f] });
  const unskip = (f: ProfileField) => setProfile({ skipped: skippedFields.filter((x) => x !== f) });
  const skipAll = () => {
    setProfile({ ...Object.values(CLEAR).reduce((a, b) => ({ ...a, ...b }), {}), skipped: Object.keys(CLEAR) as ProfileField[] });
    onDone();
  };

  const answered = profileAnsweredCount(profile);
  const skippedCount = skippedFields.length;
  const open = PROFILE_BLOCKS - answered - skippedCount;

  const industryOther = profile.industry === 'other';
  const headacheOther = profile.headache === 'other';
  const goalsOtherOpen = profile.goalsOther !== undefined;
  const goalsFull = profile.goals.length >= MAX_GOALS;

  return (
    <div className="animate-slide-in">
      <FormHeader
        eyebrow="Before we start"
        numeral="00"
        icon="Store"
        title="Tell us a little about your business"
        intro="This tailors the questions to you — a clinic sees “patients”, a school sees “students” — and sets fair targets for your stage. Every question is optional."
        questionCount={PROFILE_BLOCKS}
        minutes={1}
        skipLabel="Skip this — go straight to the questions"
        skipTitle="Skip the business details?"
        skipBody="The questions will use general wording and a middle-of-the-road target. You can fill this in later."
        onSkipAll={skipAll}
      />

      <div className="mt-3 grid gap-3">
        <NamesBlock profile={profile} setProfile={setProfile} />

        <ChoiceBlock
          number={2}
          title="What kind of business is it?"
          hint="So the questions use your words and include the ones that matter in your industry."
          kind="radio"
          layout="tile"
          gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          options={INDUSTRIES.map((i) => ({ id: i.id, label: i.label, hint: i.hint, icon: i.icon }))}
          selected={profile.industry && !industryOther ? [profile.industry] : []}
          onToggle={(id) => answer('industry', { industry: id as Profile['industry'], industryOther: undefined })}
          other={{
            open: industryOther,
            value: profile.industryOther ?? '',
            onToggle: () =>
              industryOther ? setProfile({ industry: undefined, industryOther: undefined }) : answer('industry', { industry: 'other' }),
            onChange: (v) => answer('industry', { industry: 'other', industryOther: v }),
            label: 'What does your business do?',
            placeholder: 'e.g. Printing press, event management, solar installation',
          }}
          answered={!!profile.industry && (!industryOther || !!profile.industryOther?.trim())}
          skipped={isSkipped('industry')}
          onSkip={() => skip('industry')}
          onUnskip={() => unskip('industry')}
        />

        <ChoiceBlock
          number={3}
          title="Which stage is the business at?"
          hint="A new business isn’t expected to have the systems of a ten-year-old one, so this sets fair targets."
          kind="radio"
          layout="row"
          options={LEVELS.map((l) => ({ id: l.id, label: l.label, hint: l.hint, icon: l.icon }))}
          selected={profile.level ? [profile.level] : []}
          onToggle={(id) => answer('level', { level: id as Profile['level'] })}
          answered={!!profile.level}
          skipped={isSkipped('level')}
          onSkip={() => skip('level')}
          onUnskip={() => unskip('level')}
        />

        <ChoiceBlock
          number={4}
          title="How many people work in the business, including you?"
          kind="radio"
          layout="pill"
          gridClassName="grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3"
          options={TEAM_SIZES.map((t) => ({ id: t.id, label: t.label }))}
          selected={profile.teamSize ? [profile.teamSize] : []}
          onToggle={(id) => answer('teamSize', { teamSize: id as Profile['teamSize'] })}
          answered={!!profile.teamSize}
          skipped={isSkipped('teamSize')}
          onSkip={() => skip('teamSize')}
          onUnskip={() => unskip('teamSize')}
        />

        <ChoiceBlock
          number={5}
          title="What’s your biggest headache right now?"
          hint="Pick the one that keeps you up at night. At the end we’ll check whether your answers agree."
          kind="radio"
          layout="pill"
          options={HEADACHES.map((h) => ({ id: h.id, label: fill(h.label, profile), icon: h.icon }))}
          selected={profile.headache && !headacheOther ? [profile.headache] : []}
          onToggle={(id) => answer('headache', { headache: id, headacheOther: undefined })}
          other={{
            open: headacheOther,
            value: profile.headacheOther ?? '',
            onToggle: () =>
              headacheOther ? setProfile({ headache: undefined, headacheOther: undefined }) : answer('headache', { headache: 'other' }),
            onChange: (v) => answer('headache', { headache: 'other', headacheOther: v }),
            label: 'Your biggest headache',
            placeholder: 'e.g. Suppliers keep delivering late',
          }}
          answered={!!profile.headache && (!headacheOther || !!profile.headacheOther?.trim())}
          skipped={isSkipped('headache')}
          onSkip={() => skip('headache')}
          onUnskip={() => unskip('headache')}
        />

        <ChoiceBlock
          number={6}
          title="What do you most want in the next 12 months?"
          tag="Up to 3"
          hint={
            <span className={clsx('font-semibold', goalsFull ? 'text-accent-ink' : 'text-ink')} aria-live="polite">
              {profile.goals.length} of {MAX_GOALS} chosen
            </span>
          }
          kind="checkbox"
          layout="pill"
          gridClassName="sm:grid-cols-2"
          options={GOALS.map((g) => ({
            id: g.id,
            label: g.label,
            icon: g.icon,
            disabled: goalsFull && !profile.goals.includes(g.id),
          }))}
          selected={profile.goals}
          onToggle={(id) => {
            if (profile.goals.includes(id)) answer('goals', { goals: profile.goals.filter((g) => g !== id) });
            else if (!goalsFull) answer('goals', { goals: [...profile.goals, id] });
          }}
          other={{
            open: goalsOtherOpen,
            value: profile.goalsOther ?? '',
            onToggle: () => answer('goals', { goalsOther: goalsOtherOpen ? undefined : '' }),
            onChange: (v) => answer('goals', { goalsOther: v }),
            label: 'Another goal',
            placeholder: 'e.g. Open a second branch in Dubai',
          }}
          answered={profile.goals.length > 0 || !!profile.goalsOther?.trim()}
          skipped={isSkipped('goals')}
          onSkip={() => skip('goals')}
          onUnskip={() => unskip('goals')}
        />
      </div>

      <FormFooter
        answered={answered}
        skipped={skippedCount}
        total={PROFILE_BLOCKS}
        onContinue={onDone}
        continueLabel="Start the questions"
        note={open > 0 ? 'Everything here is optional' : undefined}
      />
    </div>
  );
}

function NamesBlock({ profile, setProfile }: { profile: Profile; setProfile: (p: Partial<Profile>) => void }) {
  const bizId = useId();
  const ownerId = useId();
  const done = profile.businessName.trim().length > 0;
  return (
    <section
      aria-labelledby={`${bizId}-h`}
      className="rounded-[18px] border border-line bg-card px-4 py-4 shadow-card sm:px-5 sm:py-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={clsx(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[12px] font-semibold transition-colors',
            done ? 'bg-brand text-white' : 'border border-line-strong bg-paper text-ink-2',
          )}
        >
          {done ? <Check className="h-3.5 w-3.5 animate-badge-pop" strokeWidth={3} /> : 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${bizId}-h`} className="font-display pt-0.5 text-[16px] font-medium leading-snug text-ink sm:text-[17px]">
            What’s your business called?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            It goes on your report. Leave it blank if you prefer.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:pl-10">
        <div>
          <label htmlFor={bizId} className="mb-1 block text-[13px] font-semibold text-ink">
            Business name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={bizId}
            className="field"
            autoComplete="organization"
            placeholder="e.g. Sharma Dental Clinic"
            value={profile.businessName}
            maxLength={80}
            onChange={(e) => setProfile({ businessName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={ownerId} className="mb-1 block text-[13px] font-semibold text-ink">
            Your name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={ownerId}
            className="field"
            autoComplete="name"
            placeholder="e.g. Priya"
            value={profile.ownerName ?? ''}
            maxLength={60}
            onChange={(e) => setProfile({ ownerName: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}
