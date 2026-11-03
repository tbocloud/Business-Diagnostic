import { isAnswered } from '@/lib/engine';
import { PROFILE_BLOCKS, profileAnsweredCount } from '@/lib/profile';
import { questionsFor } from '@/lib/questions';
import { SECTIONS } from '@/lib/sections';
import { LAST_STEP, OPEN_STEP } from '@/lib/store';
import type { Ctx, Profile, SectionId } from '@/lib/types';

export type RailState = 'done' | 'current' | 'upcoming' | 'skipped';

/** A section counts as skipped when every question the client sees in it was skipped. */
export function sectionWasSkipped(id: SectionId, ctx: Ctx): boolean {
  const qs = questionsFor(id, ctx);
  return qs.length > 0 && qs.every((q) => ctx.answers[q.id]?.skipped);
}

/** Answered / skipped / still-open counts for one section form. */
export function sectionCounts(id: SectionId, ctx: Ctx) {
  const qs = questionsFor(id, ctx);
  const answered = qs.filter((q) => isAnswered(ctx.answers[q.id])).length;
  const skipped = qs.filter((q) => ctx.answers[q.id]?.skipped).length;
  return { total: qs.length, answered, skipped, open: qs.length - answered - skipped };
}

/** The client has moved past "About your business" (even if they left it blank). */
const leftProfile = (step: number, doneSections: SectionId[]) => step > 0 || doneSections.length > 0;

/** The last, open step: finished with something said, finished without (skipped), or not reached yet. */
export type OpenProgress = { done: boolean; said: boolean };

export function railStates(
  step: number,
  doneSections: SectionId[],
  ctx: Ctx,
  building = false,
  open: OpenProgress = { done: false, said: false },
): RailState[] {
  const current = building ? -1 : step;
  const profileState: RailState =
    current === 0
      ? 'current'
      : leftProfile(step, doneSections) || building
        ? profileAnsweredCount(ctx.profile) > 0
          ? 'done'
          : 'skipped'
        : 'upcoming';
  return [
    profileState,
    ...SECTIONS.map((s, i): RailState => {
      if (current === i + 1) return 'current';
      if (doneSections.includes(s.id)) return sectionWasSkipped(s.id, ctx) ? 'skipped' : 'done';
      return 'upcoming';
    }),
    current === OPEN_STEP ? 'current' : open.done ? (open.said ? 'done' : 'skipped') : 'upcoming',
  ];
}

/** The next section step (1..8) that isn't finished yet — looking forward first, then wrapping round. */
export function nextOpenStep(step: number, doneSections: SectionId[]): number | null {
  for (let s = step + 1; s <= LAST_STEP; s++) if (!doneSections.includes(SECTIONS[s - 1].id)) return s;
  for (let s = 1; s < step; s++) if (!doneSections.includes(SECTIONS[s - 1].id)) return s;
  return null;
}

/** 0..1 across "About your business" + the 8 sections. */
export function overallProgress(args: {
  step: number;
  profile: Profile;
  ctx: Ctx;
  doneSections: SectionId[];
  building?: boolean;
  openDone?: boolean;
}): number {
  const { step, profile, ctx, doneSections, building, openDone } = args;
  if (building) return 1;
  let units = leftProfile(step, doneSections) ? 1 : profileAnsweredCount(profile) / PROFILE_BLOCKS;
  SECTIONS.forEach((s, i) => {
    if (doneSections.includes(s.id)) units += 1;
    else if (step === i + 1) {
      const c = sectionCounts(s.id, ctx);
      units += c.total ? (c.answered + c.skipped) / c.total : 0;
    }
  });
  if (openDone) units += 1;
  // Profile + the sections + the open step.
  return Math.min(1, units / (SECTIONS.length + 2));
}

export function minutesFor(questionCount: number): number {
  return Math.max(1, Math.round((questionCount * 12) / 60));
}
