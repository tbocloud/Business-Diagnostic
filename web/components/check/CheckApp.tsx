'use client';

import { Check, CheckCircle2, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { scoreSection } from '@/lib/engine';
import { PROFILE_BLOCKS, profileAnsweredCount } from '@/lib/profile';
import { SECTION_BY_ID } from '@/lib/sections';
import { sectionAtStep, useCheck } from '@/lib/store';
import { syncSubmission } from '@/lib/submit';
import type { Ctx, SectionId } from '@/lib/types';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { BuildingReport } from './BuildingReport';
import { nextOpenStep, overallProgress, railStates, sectionCounts, sectionWasSkipped } from './flow';
import { ProfileForm } from './ProfileForm';
import { buildRailItems, MobileStepper, SectionRail } from './SectionRail';
import { SectionForm } from './SectionForm';
import { TopBar } from './TopBar';

const scrollTop = () => window.scrollTo({ top: 0 });

export function CheckApp() {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const profile = useCheck((s) => s.profile);
  const answers = useCheck((s) => s.answers);
  const step = useCheck((s) => s.step);
  const doneSections = useCheck((s) => s.doneSections);
  const completedAt = useCheck((s) => s.completedAt);
  const [building, setBuilding] = useState(false);
  /** The section just saved or skipped — shown as a small banner on the next form. */
  const [justDone, setJustDone] = useState<SectionId | null>(null);

  const ctx: Ctx = { profile, answers };
  const section = sectionAtStep(step);

  const go = useCallback((target: number) => {
    useCheck.getState().goTo(target);
    scrollTop();
  }, []);

  /** After a form: open the next unfinished section, or build the report if none is left. */
  const moveOn = useCallback(
    (fromStep: number, finished: SectionId | null) => {
      const next = nextOpenStep(fromStep, useCheck.getState().doneSections);
      setJustDone(finished);
      if (next) go(next);
      else {
        setBuilding(true);
        // Save to the team's database while the "Building your report…" screen shows.
        void syncSubmission();
        scrollTop();
      }
    },
    [go],
  );

  const onBuilt = useCallback(() => {
    useCheck.getState().finish();
    router.push('/results');
  }, [router]);

  const jump = useCallback(
    (target: number) => {
      setJustDone(null);
      setBuilding(false);
      go(target);
    },
    [go],
  );

  if (!hydrated) {
    return (
      <div className="min-h-dvh">
        <TopBar progress={0} showReportLink={false} />
        <PageSkeleton />
      </div>
    );
  }

  const progress = overallProgress({ step, profile, ctx, doneSections, building });
  const states = railStates(step, doneSections, ctx, building);
  const detail = section
    ? (() => {
        const c = sectionCounts(section.id, ctx);
        return `${c.answered} of ${c.total} answered`;
      })()
    : `${profileAnsweredCount(profile)} of ${PROFILE_BLOCKS} answered`;
  const railItems = buildRailItems(states, building ? -1 : step, detail);

  let content: React.ReactNode;
  if (building) {
    content = <BuildingReport businessName={profile.businessName} onDone={onBuilt} />;
  } else if (!section) {
    content = <ProfileForm onDone={() => moveOn(0, null)} />;
  } else {
    const lastOne = nextOpenStep(step, [...doneSections, section.id]) === null;
    content = (
      <SectionForm
        key={section.id}
        section={section}
        number={step}
        profile={profile}
        answers={answers}
        notice={justDone && justDone !== section.id ? <DoneBanner id={justDone} ctx={ctx} /> : undefined}
        continueLabel={lastOne ? 'See my results' : 'Save & continue'}
        onBack={() => {
          setJustDone(null);
          go(step - 1);
        }}
        onContinue={() => {
          useCheck.getState().finishSection(section.id);
          moveOn(step, section.id);
        }}
        onSkipSection={() => {
          useCheck.getState().skipSection(section.id);
          moveOn(step, section.id);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <TopBar progress={progress} showReportLink={!!completedAt && !building} />
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-16">
        <aside className="hidden py-10 lg:block">
          <div className="sticky top-24">
            <SectionRail items={railItems} onJump={jump} />
          </div>
        </aside>
        {/* overflow-x-clip: the slide-in animation must never cause sideways scroll (clip keeps the sticky footer working) */}
        <main id="main" className="overflow-x-clip pt-4 lg:pt-10">
          <div className="mx-auto w-full max-w-question">
            {!building && (
              <div className="mb-5 lg:hidden">
                <MobileStepper items={railItems} currentStep={step} onJump={jump} />
                <p className="mt-2 flex items-center justify-end gap-1 text-[12px] text-muted">
                  <Check className="h-3.5 w-3.5 text-ok-ink" strokeWidth={2.5} aria-hidden="true" />
                  Progress saved automatically
                </p>
              </div>
            )}
            {content}
          </div>
        </main>
      </div>
    </div>
  );
}

/** "✓ Sales & Revenue saved — 2 strengths spotted · 1 thing worth a look" */
function DoneBanner({ id, ctx }: { id: SectionId; ctx: Ctx }) {
  const title = SECTION_BY_ID[id].title;
  if (sectionWasSkipped(id, ctx)) {
    return (
      <p role="status" className="mb-4 flex animate-rise items-center gap-2.5 rounded-2xl border border-line bg-paper-deep/60 px-4 py-3 text-[14px] text-ink-2">
        <SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">{title}</strong> skipped — you can come back to it any time.
        </span>
      </p>
    );
  }
  const r = scoreSection(id, ctx);
  const strengths = r.strengths.length;
  const worth = r.gaps.length + r.watch.length;
  const bits = [
    strengths > 0 && `${strengths} strength${strengths === 1 ? '' : 's'} spotted`,
    worth > 0 && `${worth} thing${worth === 1 ? '' : 's'} worth a look`,
  ].filter(Boolean);
  return (
    <p role="status" className="mb-4 flex animate-rise items-center gap-2.5 rounded-2xl border border-ok/30 bg-ok-soft px-4 py-3 text-[14px] text-ink-2">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-ok-ink" aria-hidden="true" />
      <span>
        <strong className="font-semibold text-ink">{title} saved.</strong> {bits.length ? bits.join(' · ') : 'Nice work.'}
      </span>
    </p>
  );
}
