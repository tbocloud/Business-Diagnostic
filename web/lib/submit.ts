'use client';

import { publicApi, type SubmissionSummary } from './api';
import { computeResults } from './engine';
import { headacheLabel } from './profile';
import { useCheck } from './store';
import type { Answers, Profile, Results } from './types';

/** Profile labels say "Not specified" when skipped — store those as empty instead. */
const given = (label: string) => (label === 'Not specified' ? null : label);

/** The small snapshot stored with each submission — what the BDE list shows without recomputing. */
export function buildSummary(profile: Profile, results: Results): SubmissionSummary {
  return {
    overall: results.overall,
    band: results.band.label,
    target: results.target,
    potential: results.potential,
    industryLabel: given(results.industryLabel),
    levelLabel: given(results.levelLabel),
    teamLabel: given(results.teamLabel),
    headache: headacheLabel(profile) ?? null,
    realGap: results.realGap ? results.realGap.actual.title : null,
    realGapId: results.realGap ? results.realGap.actual.id : null,
    sections: Object.fromEntries(results.sections.map((s) => [s.id, s.score])),
    strengths: results.stats.strengths,
    gaps: results.stats.gaps,
    quickWins: results.stats.quickWins,
    answered: results.stats.answered,
    asked: results.stats.asked,
    topGaps: results.gaps.slice(0, 5).map((g) => g.title),
    services: results.services.map((s) => s.id),
  };
}

let inFlight: Promise<boolean> | null = null;
let queued: Promise<boolean> | null = null;

/**
 * Save (or re-save) this browser's finished check-up to the team's database.
 * Never throws: the client's own report works even when the server can't be reached.
 * A call made while a save is running queues one more save, so the newest answers always land.
 */
export function syncSubmission(): Promise<boolean> {
  if (inFlight) {
    queued ??= inFlight.then(() => {
      queued = null;
      return syncSubmission();
    });
    return queued;
  }
  const s = useCheck.getState();
  const profile: Profile = s.profile;
  const answers: Answers = s.answers;
  const results = computeResults(profile, answers);

  inFlight = publicApi
    .submit({
      submissionId: s.submissionId,
      token: s.submissionToken,
      profile,
      answers,
      summary: buildSummary(profile, results),
      // The note from the last step also travels with the check-up, in case sending it on its own failed.
      ...(s.open.text.trim() ? { openText: s.open.text.trim().slice(0, 3000) } : {}),
    })
    .then(({ submissionId, token }) => {
      useCheck.getState().setSubmission(submissionId, token);
      return true;
    })
    .catch((e) => {
      console.warn('Could not save the check-up to the server:', e);
      return false;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
