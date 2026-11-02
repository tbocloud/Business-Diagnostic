// ─────────────────────────────────────────────────────────────
// Core types for the Business Health Check.
// Everything is rule-based and runs in the browser — no AI, no backend.
// ─────────────────────────────────────────────────────────────

export type LevelId = 'starting' | 'growing' | 'established' | 'scaling';

export type IndustryId =
  | 'retail'
  | 'food'
  | 'manufacturing'
  | 'services'
  | 'healthcare'
  | 'construction'
  | 'education'
  | 'trading'
  | 'hospitality'
  | 'tech'
  | 'other';

export type TeamSizeId = 'solo' | 'small' | 'medium' | 'large' | 'xlarge';

export type SectionId =
  | 'sales'
  | 'marketing'
  | 'customers'
  | 'operations'
  | 'finance'
  | 'team'
  | 'technology'
  | 'strategy';

export type Effort = 'quick' | 'medium' | 'big';

/** Team Back Office's service lines (names and pitches live in lib/brand.ts). */
export type ServiceId = 'erp' | 'marketing' | 'ai';

export interface Solution {
  services: ServiceId[];
  /** How the service(s) fix this specific gap — plain language, may contain vocabulary tokens. */
  text: string;
}

/** A service the client's gaps point to, with the gaps it would fix (most urgent first). */
export interface ServiceRecommendation {
  id: ServiceId;
  /** Sum of the severities of the gaps it fixes — used for ordering. */
  weight: number;
  items: { questionId: string; title: string; sectionTitle: string; kind: 'gap' | 'watch' }[];
}

/** One answer choice. `score` is 0–100; leave it out for neutral choices that shouldn't affect the score. */
export interface Option {
  id: string;
  label: string;
  score?: number;
  /** Multi-select only: picking this clears every other choice (e.g. "None of these"). */
  exclusive?: boolean;
}

/** What the client entered for one question. */
export interface Answer {
  /** Option ids picked. Single-select questions hold at most one. */
  selected: string[];
  /** Text typed into "Other — type your own". */
  other?: string;
  /** True when the client chose to skip this question (or its whole section). */
  skipped?: boolean;
}

export type Answers = Record<string, Answer>;

/** Profile questions the client can skip. */
export type ProfileField = 'industry' | 'level' | 'teamSize' | 'headache' | 'goals';

export interface Profile {
  /** Optional — the report says "Your business" when it's blank. */
  businessName: string;
  ownerName?: string;
  industry?: IndustryId;
  /** Free text when industry === 'other'. */
  industryOther?: string;
  level?: LevelId;
  teamSize?: TeamSizeId;
  /** Id from HEADACHES, or 'other'. */
  headache?: string;
  headacheOther?: string;
  /** Ids from GOALS. */
  goals: string[];
  goalsOther?: string;
  /** Profile questions the client chose to skip. Everything still works without them. */
  skipped?: ProfileField[];
}

export interface Ctx {
  profile: Profile;
  answers: Answers;
}

export interface Question {
  id: string;
  section: SectionId;
  /** May contain vocabulary tokens: {customer} {customers} {offering} {place} (capitalise the first letter for Title case). */
  text: string;
  /** Optional one-line helper shown under the question. */
  hint?: string;
  type: 'single' | 'multi';
  options: Option[];
  /** Show the "Other — type your own" choice. Defaults to true. */
  allowOther?: boolean;
  /** 1 = nice to have, 2 = important (default), 3 = critical. */
  weight?: 1 | 2 | 3;
  /** When present, the question is only asked if this returns true. */
  show?: (ctx: Ctx) => boolean;

  // ── Plain-language notes used on the results dashboard ──
  /** Headline when the answer is good (score ≥ 70). */
  strength: string;
  /** Headline when the answer reveals a gap (score < 45). */
  gap: string;
  /** Why it matters, in one or two plain sentences. */
  why: string;
  /** A concrete first step the client can take. */
  fix: string;
  /** How big the first step is — drives the action-plan timeline. */
  effort: Effort;
  /** More concrete steps after `fix` (shown as "Next steps" 2, 3…). */
  steps?: string[];
  /** How Team Back Office's ERP / digital marketing / AI services solve this gap (only where it fits). */
  solution?: Solution;
}

export interface Section {
  id: SectionId;
  title: string;
  /** Short label for tight spaces (nav rail, chart axes). */
  short: string;
  /** lucide-react icon name. */
  icon: string;
  /** Shown on the section intro screen: why this area matters. */
  intro: string;
  /** Used in the "real gap" story: how a weakness here shows up across the business. */
  rootNote: string;
  /** Discovery questions a BDE can ask the owner during the review (may contain vocabulary tokens). */
  bdeAsk: [string, string];
}

// ── Results ─────────────────────────────────────────────────

export type InsightKind = 'strength' | 'watch' | 'gap';

export interface Insight {
  questionId: string;
  section: SectionId;
  kind: InsightKind;
  /** Headline (already vocabulary-filled). */
  title: string;
  /** The client's own answer, for context. */
  answerLabel: string;
  why: string;
  fix: string;
  effort: Effort;
  /** Further next steps (already vocabulary-filled). */
  steps: string[];
  solution?: Solution;
  score: number;
  weight: number;
  /** Higher = more urgent. (100 − score) × weight. */
  severity: number;
}

export type SectionStatus = 'healthy' | 'push' | 'priority' | 'not-assessed';

export interface OwnWords {
  questionId: string;
  question: string;
  answer: string;
}

export interface SectionResult {
  id: SectionId;
  title: string;
  short: string;
  icon: string;
  score: number | null;
  /** Target score for the client's business stage. */
  target: number;
  status: SectionStatus;
  statusLabel: string;
  asked: number;
  answered: number;
  skipped: number;
  strengths: Insight[];
  watch: Insight[];
  gaps: Insight[];
  ownWords: OwnWords[];
  /** One plain-language sentence summarising the section. */
  note: string;
}

export interface HealthBand {
  label: string;
  tone: 'great' | 'good' | 'fair' | 'weak' | 'risk';
  blurb: string;
}

export interface RealGap {
  /** Section with the biggest shortfall against the stage target. */
  actual: SectionResult;
  /** What the client said bothers them most, if they told us. */
  perceived?: { label: string; sections: SectionResult[] };
  /** true when the client's own view and the answers agree. */
  match: boolean | null;
  headline: string;
  story: string;
  /** The single most severe gap inside the actual section. */
  topIssue?: Insight;
  /** The strongest section — a confidence boost. */
  hiddenStrength?: SectionResult;
}

export interface ActionItem {
  title: string;
  fix: string;
  section: SectionId;
  sectionTitle: string;
  effort: Effort;
}

/**
 * One eye-catching point for the dashboard's "Key points" strip and the BDE review mode.
 * `big` is the thing the eye lands on; `talk` is the presenter's script — hide it from the owner by default.
 */
export interface KeyPoint {
  id: 'score' | 'strength' | 'realgap' | 'issue' | 'quickwin' | 'opportunity';
  tone: 'good' | 'warn' | 'gap' | 'action' | 'neutral';
  /** lucide-react icon name. */
  icon: string;
  /** Small caption above the big value, e.g. "Overall health". */
  label: string;
  /** The eye-catcher: "44/100", "Money & Profit", "44 → 62". */
  big: string;
  /** One plain-language line. */
  headline: string;
  /** One or two sentences for the owner. */
  detail: string;
  /** BDE talking notes: what to say, how to frame it. */
  talk: string;
  /** A discovery question the BDE can ask the owner, if any. */
  ask?: string;
  /** The area this point is about, if any — lets the UI show its score vs target. */
  section?: SectionId;
  /** What the owner actually answered (for 'strength' and 'issue'), to show as evidence. */
  said?: string;
}

export interface Results {
  businessName: string;
  overall: number | null;
  band: HealthBand;
  target: number;
  levelLabel: string;
  industryLabel: string;
  teamLabel: string;
  sections: SectionResult[];
  strengths: Insight[];
  gaps: Insight[];
  realGap: RealGap | null;
  actionPlan: { week: ActionItem[]; month: ActionItem[]; quarter: ActionItem[] };
  summary: string;
  /** Six headline points in presentation order — for the "Key points" strip and review mode. */
  keyPoints: KeyPoint[];
  /** Overall score if every scored area reached its stage target (never below `overall`). */
  potential: number | null;
  /** Services that would fix the client's gaps, most relevant first (empty if none apply). */
  services: ServiceRecommendation[];
  stats: {
    asked: number;
    answered: number;
    skipped: number;
    strengths: number;
    gaps: number;
    quickWins: number;
  };
}
