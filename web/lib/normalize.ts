import { GOALS, HEADACHES, INDUSTRIES, LEVELS, TEAM_SIZES } from './profile';
import type { Answer, Answers, IndustryId, LevelId, Profile, ProfileField, TeamSizeId } from './types';

// Report data can come from places we don't control: a #r= share link anyone can edit,
// or a row in the database written by the public submit endpoint. Before it reaches the
// scoring engine, keep only well-formed values — so bad data shows "link looks incomplete"
// (or is simply ignored) instead of crashing the page.

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const oneOf = <T extends string>(v: unknown, allowed: readonly string[]): T | undefined =>
  typeof v === 'string' && allowed.includes(v) ? (v as T) : undefined;

const INDUSTRY_IDS = [...INDUSTRIES.map((i) => i.id), 'other'];
const LEVEL_IDS = LEVELS.map((l) => l.id);
const TEAM_IDS = TEAM_SIZES.map((t) => t.id);
const HEADACHE_IDS = [...HEADACHES.map((h) => h.id), 'other'];
const GOAL_IDS = GOALS.map((g) => g.id);
const PROFILE_FIELDS: ProfileField[] = ['industry', 'level', 'teamSize', 'headache', 'goals'];

export function normalizeProfile(p: unknown): Profile | null {
  if (!isObj(p)) return null;
  return {
    businessName: str(p.businessName) ?? '',
    ownerName: str(p.ownerName),
    industry: oneOf<IndustryId>(p.industry, INDUSTRY_IDS),
    industryOther: str(p.industryOther),
    level: oneOf<LevelId>(p.level, LEVEL_IDS),
    teamSize: oneOf<TeamSizeId>(p.teamSize, TEAM_IDS),
    headache: oneOf<string>(p.headache, HEADACHE_IDS),
    headacheOther: str(p.headacheOther),
    goals: Array.isArray(p.goals) ? p.goals.filter((g): g is string => typeof g === 'string' && GOAL_IDS.includes(g)) : [],
    goalsOther: str(p.goalsOther),
    skipped: Array.isArray(p.skipped)
      ? p.skipped.filter((f): f is ProfileField => typeof f === 'string' && (PROFILE_FIELDS as string[]).includes(f))
      : undefined,
  };
}

/** Malformed individual answers are dropped; a non-object answer map is rejected. */
export function normalizeAnswers(a: unknown): Answers | null {
  if (!isObj(a)) return null;
  const out: Answers = {};
  for (const [id, v] of Object.entries(a)) {
    if (!isObj(v) || !Array.isArray(v.selected)) continue;
    const answer: Answer = { selected: v.selected.filter((x): x is string => typeof x === 'string') };
    if (typeof v.other === 'string') answer.other = v.other;
    // Number questions: a finite figure within a sane range (each question checks its own range when asked).
    if (typeof v.value === 'number' && Number.isFinite(v.value) && Math.abs(v.value) <= 1e12) answer.value = v.value;
    if (v.skipped === true) answer.skipped = true;
    out[id] = answer;
  }
  return out;
}

export function normalizeReport(profile: unknown, answers: unknown): { profile: Profile; answers: Answers } | null {
  const p = normalizeProfile(profile);
  const a = normalizeAnswers(answers);
  return p && a ? { profile: p, answers: a } : null;
}
