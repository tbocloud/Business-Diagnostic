import { fill, HEADACHES, headacheLabel, industryLabel, levelLabel, targetFor, teamLabel } from './profile';
import { QUESTION_BY_ID, questionsFor } from './questions';
import { SECTIONS, SECTION_BY_ID } from './sections';
import type {
  ActionItem,
  Answer,
  Answers,
  Ctx,
  HealthBand,
  Insight,
  KeyPoint,
  OwnWords,
  Profile,
  Question,
  RealGap,
  Results,
  SectionId,
  SectionResult,
  SectionStatus,
} from './types';

// ── Thresholds ──────────────────────────────────────────────
export const STRENGTH_AT = 70; // score ≥ 70 → strength
export const GAP_BELOW = 45; //   score < 45 → gap ; in between → "could be stronger"
/** Within this many points under target → "needs a push"; further → "priority gap". */
const PUSH_MARGIN = 12;

// ── Per-question scoring ────────────────────────────────────

/** 0–100 for an answered, scorable question; null when skipped / free-text only / neutral. */
export function scoreQuestion(q: Question, a: Answer | undefined): number | null {
  if (!a || a.skipped) return null;
  const picked = q.options.filter((o) => a.selected.includes(o.id));
  if (picked.length === 0) return null; // "Other" text only — shown in notes, not scored
  if (q.type === 'single') return picked[0].score ?? null;
  const exclusive = picked.find((o) => o.exclusive);
  if (exclusive) return exclusive.score ?? 0;
  const scored = picked.filter((o) => o.score !== undefined);
  if (scored.length === 0) return null;
  return Math.min(100, scored.reduce((sum, o) => sum + (o.score ?? 0), 0));
}

export function isAnswered(a: Answer | undefined): boolean {
  return !!a && !a.skipped && (a.selected.length > 0 || !!a.other?.trim());
}

function answerLabel(q: Question, a: Answer, profile: Profile): string {
  const labels = q.options.filter((o) => a.selected.includes(o.id)).map((o) => fill(o.label, profile));
  if (a.other?.trim()) labels.push(`“${a.other.trim()}”`);
  return labels.join(', ');
}

function makeInsight(q: Question, a: Answer, score: number, profile: Profile): Insight {
  const weight = q.weight ?? 2;
  const kind = score >= STRENGTH_AT ? 'strength' : score < GAP_BELOW ? 'gap' : 'watch';
  return {
    questionId: q.id,
    section: q.section,
    kind,
    title: fill(kind === 'strength' ? q.strength : q.gap, profile),
    answerLabel: answerLabel(q, a, profile),
    why: fill(q.why, profile),
    fix: fill(q.fix, profile),
    effort: q.effort,
    score,
    weight,
    severity: (100 - score) * weight,
  };
}

// ── Section scoring ─────────────────────────────────────────

const STATUS_LABEL: Record<SectionStatus, string> = {
  healthy: 'Healthy',
  push: 'Needs a push',
  priority: 'Priority gap',
  'not-assessed': 'Not assessed',
};

function sectionStatus(score: number | null, target: number): SectionStatus {
  if (score === null) return 'not-assessed';
  if (score >= target) return 'healthy';
  if (score >= target - PUSH_MARGIN) return 'push';
  return 'priority';
}

function sectionNote(r: Omit<SectionResult, 'note'>): string {
  if (r.status === 'not-assessed') {
    return r.skipped > 0 ? 'You skipped this area, so it isn’t included in your score.' : 'Not enough answers to score this area.';
  }
  const best = r.strengths[0];
  const worst = r.gaps[0] ?? r.watch[0];
  if (r.status === 'healthy') {
    return worst
      ? `A solid area for you. Keep an eye on one thing: ${lower(worst.title)}.`
      : 'A real strength — this area is working well for your stage.';
  }
  if (r.status === 'push') {
    return best && worst
      ? `${best.title} — but ${lower(worst.title)}.`
      : 'Close to where it should be. A few small fixes will lift this area.';
  }
  return worst
    ? `This is holding the business back. Biggest issue: ${lower(worst.title)}.`
    : 'This area is well below where it should be for your stage.';
}

function lower(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

export function scoreSection(id: SectionId, ctx: Ctx): SectionResult {
  const s = SECTION_BY_ID[id];
  const target = targetFor(ctx.profile);
  const qs = questionsFor(id, ctx);
  const insights: Insight[] = [];
  const ownWords: OwnWords[] = [];
  let weighted = 0;
  let weights = 0;
  let answered = 0;
  let skipped = 0;

  for (const q of qs) {
    const a = ctx.answers[q.id];
    if (a?.skipped) skipped++;
    if (!isAnswered(a)) continue;
    answered++;
    if (a!.other?.trim()) {
      ownWords.push({ questionId: q.id, question: fill(q.text, ctx.profile), answer: a!.other.trim() });
    }
    const score = scoreQuestion(q, a);
    if (score === null) continue;
    const w = q.weight ?? 2;
    weighted += score * w;
    weights += w;
    insights.push(makeInsight(q, a!, score, ctx.profile));
  }

  const score = weights > 0 ? Math.round(weighted / weights) : null;
  const status = sectionStatus(score, target);
  const bySeverity = (x: Insight, y: Insight) => y.severity - x.severity;
  const byStrength = (x: Insight, y: Insight) => y.score * y.weight - x.score * x.weight;

  const base = {
    id,
    title: s.title,
    short: s.short,
    icon: s.icon,
    score,
    target,
    status,
    statusLabel: STATUS_LABEL[status],
    asked: qs.length,
    answered,
    skipped,
    strengths: insights.filter((i) => i.kind === 'strength').sort(byStrength),
    watch: insights.filter((i) => i.kind === 'watch').sort(bySeverity),
    gaps: insights.filter((i) => i.kind === 'gap').sort(bySeverity),
    ownWords,
  };
  return { ...base, note: sectionNote(base) };
}

// ── Overall band ────────────────────────────────────────────

export function healthBand(score: number | null): HealthBand {
  if (score === null)
    return { label: 'Not enough answers', tone: 'fair', blurb: 'Answer a few more questions to see your full picture.' };
  if (score >= 80)
    return { label: 'Thriving', tone: 'great', blurb: 'Strong foundations across the business. The job now is to protect them and grow.' };
  if (score >= 65)
    return { label: 'Strong & growing', tone: 'good', blurb: 'Much is working well. A few focused fixes will unlock the next level.' };
  if (score >= 50)
    return { label: 'Steady, with clear gaps', tone: 'fair', blurb: 'The basics are in place, but some gaps are quietly costing you time and money.' };
  if (score >= 35)
    return { label: 'Needs attention', tone: 'weak', blurb: 'Several important areas need work. The good news: the first fixes are simple.' };
  return { label: 'Under pressure', tone: 'risk', blurb: 'The business is running on effort rather than systems. A few changes will make a big difference fast.' };
}

// ── The real gap ────────────────────────────────────────────

function findRealGap(sections: SectionResult[], profile: Profile): RealGap | null {
  const scored = sections.filter((s) => s.score !== null);
  if (scored.length === 0) return null;

  // Biggest shortfall vs. stage target; ties → lower score.
  const actual = [...scored].sort((a, b) => a.score! - a.target - (b.score! - b.target) || a.score! - b.score!)[0];
  const best = [...scored].sort((a, b) => b.score! - a.score!)[0];
  const topIssue = actual.gaps[0] ?? actual.watch[0];

  const said = headacheLabel(profile);
  const mapping = HEADACHES.find((h) => h.id === profile.headache);
  const perceivedSections = mapping ? sections.filter((s) => mapping.sections.includes(s.id)) : [];
  const perceived = said ? { label: said, sections: perceivedSections } : undefined;
  const rootNote = fill(SECTION_BY_ID[actual.id].rootNote, profile);
  const issueLine = topIssue ? ` The biggest single issue here: ${lower(topIssue.title)}.` : '';
  const hiddenStrength = best.id !== actual.id && best.score! >= best.target ? best : undefined;

  // Every area is at or above target: frame it as the next opportunity, not a problem.
  if (actual.score! >= actual.target) {
    return {
      actual,
      perceived,
      match: null,
      headline: actual.score! >= 90 ? 'No major gaps found' : `No major gaps — your next opportunity is ${actual.title}`,
      story: `Every area you answered is at or above the target for your stage — that's rare. ${perceived ? `You mentioned “${perceived.label}” as a headache; ` : ''}the area with the most room left to grow is ${actual.title} (${actual.score}/100).${issueLine}`,
      topIssue,
      hiddenStrength,
    };
  }

  // No headache given (or a typed-in one we can't map): just name the gap.
  if (!perceived || perceivedSections.length === 0) {
    return {
      actual,
      perceived,
      match: null,
      headline: `Your real gap: ${actual.title}`,
      story: `${perceived ? `You told us your biggest headache is “${perceived.label}”. ` : ''}Looking across all your answers, the area furthest behind where it should be for your stage is ${actual.title} (${actual.score}/100 against a target of ${actual.target}). ${rootNote}${issueLine}`,
      topIssue,
      hiddenStrength,
    };
  }

  const match = perceivedSections.some((s) => s.id === actual.id);
  if (match) {
    return {
      actual,
      perceived,
      match,
      headline: `You're right — ${actual.title} is where the real gap is`,
      story: `You told us your biggest headache is “${perceived.label}”, and your answers agree: ${actual.title} scored ${actual.score}/100 against a target of ${actual.target} for your stage. ${rootNote}${issueLine}`,
      topIssue,
      hiddenStrength,
    };
  }

  const felt = perceivedSections.filter((s) => s.score !== null);
  const feltLine = felt.length
    ? ` Your ${felt.map((s) => `${s.title} (${s.score})`).join(' and ')} ${felt.length > 1 ? 'are' : 'is'} actually in better shape than ${actual.title} (${actual.score}).`
    : '';
  return {
    actual,
    perceived,
    match,
    headline: 'The real gap may not be where you think',
    story: `You told us your biggest headache is “${perceived.label}”. That's the symptom you feel every day — but your answers point to ${actual.title} as the deeper cause.${feltLine} ${rootNote}${issueLine}`,
    topIssue,
    hiddenStrength,
  };
}

// ── Action plan ─────────────────────────────────────────────

function buildActionPlan(gaps: Insight[], watch: Insight[]): Results['actionPlan'] {
  const toItem = (i: Insight): ActionItem => ({
    title: i.title,
    fix: i.fix,
    section: i.section,
    sectionTitle: SECTION_BY_ID[i.section].title,
    effort: i.effort,
  });
  const pool = [...gaps, ...watch]; // gaps first, each already sorted by severity
  const pick = (effort: Insight['effort']) => pool.filter((i) => i.effort === effort).slice(0, 4).map(toItem);
  return { week: pick('quick'), month: pick('medium'), quarter: pick('big') };
}

// ── Key points (dashboard strip + BDE review mode) ──────────

/** Overall score if every scored area were lifted to its stage target. */
function potentialScore(sections: SectionResult[]): number | null {
  const scored = sections.filter((s) => s.score !== null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((sum, s) => sum + Math.max(s.score!, s.target), 0) / scored.length);
}

function buildKeyPoints(args: {
  profile: Profile;
  overall: number | null;
  potential: number | null;
  band: HealthBand;
  target: number;
  levelLabel: string;
  sections: SectionResult[];
  gaps: Insight[];
  realGap: RealGap | null;
  actionPlan: Results['actionPlan'];
  quickWins: number;
}): KeyPoint[] {
  const { profile, overall, potential, band, target, levelLabel: stage, sections, gaps, realGap, actionPlan, quickWins } = args;
  if (overall === null) return [];
  const ask = (id: SectionId, i: 0 | 1) => fill(SECTION_BY_ID[id].bdeAsk[i], profile);
  const scored = sections.filter((s) => s.score !== null);
  const unscored = sections.length - scored.length;
  const coverage = unscored > 0 ? ` Based on ${scored.length} of ${sections.length} areas — the rest were skipped.` : '';
  const points: KeyPoint[] = [];

  // 1 — Overall score
  const above = overall >= target;
  points.push({
    id: 'score',
    tone: band.tone === 'great' || band.tone === 'good' ? 'good' : band.tone === 'fair' ? 'warn' : 'gap',
    icon: 'Gauge',
    label: 'Overall health',
    big: `${overall}/100`,
    headline: band.label,
    detail: `The guide level for a business at the “${stage.toLowerCase()}” stage is ${target}. ${band.blurb}${coverage}`,
    talk: above
      ? `Open with the win: they are above the guide level for their stage. Then move on: “Let's find where the next jump comes from.”`
      : `Keep it calm: “This is a starting point, not a grade. Every business has gaps — what matters is fixing the right ones first.” Don't dwell on the number; move to what's working.`,
  });

  // 2 — What's working best
  const best = [...scored].sort((a, b) => b.score! - a.score!)[0];
  const bestStrength = best.strengths[0];
  points.push({
    id: 'strength',
    // Only "good" when the best area really is on target — otherwise it's just the least-weak area.
    tone: best.score! >= best.target ? 'good' : 'neutral',
    section: best.id,
    said: bestStrength?.answerLabel,
    icon: 'Sparkles',
    label: "What's working best",
    big: best.title,
    headline: bestStrength ? bestStrength.title : `Your strongest area at ${best.score}/100`,
    detail: `${best.title} scored ${best.score}/100 — ${best.score! >= best.target ? 'above' : 'the closest to'} the target of ${best.target} for your stage. This is a foundation to build on.`,
    talk: 'Praise this sincerely before any gaps. Owners open up when they talk about what they are proud of.',
    ask: `How did you build this? What would it take to get the rest of the business to this level?`,
  });

  // 3 — The real gap (skipped when every area is on target — the 'opportunity' point says so instead)
  if (realGap && realGap.actual.score! < realGap.actual.target) {
    const a = realGap.actual;
    const said = realGap.perceived?.label;
    points.push({
      id: 'realgap',
      tone: a.score! >= a.target ? 'warn' : 'gap',
      section: a.id,
      icon: 'Target',
      label: 'The real gap',
      big: a.title,
      headline: realGap.headline,
      detail:
        `${a.score}/100 against a target of ${a.target}. ` +
        (realGap.match === false && said
          ? `You felt the problem was “${said}” — but the answers point here as the deeper cause.`
          : realGap.match === true && said
            ? `This matches what you told us: “${said}”.`
            : fill(SECTION_BY_ID[a.id].rootNote, profile)),
      talk:
        realGap.match === false && said
          ? `Read their headache back to them first: “You told us ${said.toLowerCase()}.” Then show this area: “Your answers suggest this is the root — it's usually why that headache keeps coming back.” Let them react before moving on.`
          : realGap.match === true
            ? `Confirm their instinct — “You were right” — then show exactly where in this area it comes from. Being proven right builds trust.`
            : `Name the area plainly, then explain in one sentence how it shows up day to day. Pause and let them respond.`,
      ask: ask(a.id, 0),
    });
  }

  // 4 — Most urgent issue across the whole business (may sit outside the real-gap area —
  // the real gap is the weakest AREA; this is the single highest-impact ANSWER anywhere).
  const issue = gaps[0];
  if (issue) {
    const sameAsGap = realGap?.actual.id === issue.section;
    points.push({
      id: 'issue',
      tone: 'gap',
      icon: 'AlertTriangle',
      label: 'Most urgent issue',
      big: issue.title,
      headline: sameAsGap
        ? `Inside ${SECTION_BY_ID[issue.section].title} — the real gap`
        : `In ${SECTION_BY_ID[issue.section].title} — the costliest single answer overall`,
      section: issue.section,
      said: issue.answerLabel,
      detail: issue.why,
      talk: `Asked “${fill(QUESTION_BY_ID[issue.questionId]?.text ?? '', profile)}”, they answered “${issue.answerLabel}”. Connect it to money or time — what is this costing them each month?`,
      ask: ask(issue.section, sameAsGap ? 1 : 0),
    });
  }

  // 5 — Start this week
  const first = actionPlan.week[0] ?? actionPlan.month[0];
  if (first) {
    const isWeek = !!actionPlan.week[0];
    points.push({
      id: 'quickwin',
      tone: 'action',
      icon: 'Zap',
      label: isWeek ? 'Start this week' : 'Start this month',
      // Must agree with the "Quick wins" stat tile (= stats.quickWins).
      big: quickWins > 1 ? `${quickWins} quick wins` : quickWins === 1 ? '1 quick win' : 'First step',
      section: first.section,
      headline: first.fix,
      detail: `This tackles: ${lower(first.title)} (${first.sectionTitle}).`,
      talk: 'Agree on this one action, who will own it, and a date — before the meeting ends. A small early win builds trust for the bigger fixes.',
      ask: 'Who in your team could own this, and by when?',
    });
  }

  // 6 — The opportunity
  if (potential !== null && potential > overall) {
    points.push({
      id: 'opportunity',
      tone: 'neutral',
      icon: 'TrendingUp',
      label: 'The opportunity',
      big: `${overall} → ${potential}`,
      headline: 'Where your score goes when every area reaches its target',
      detail: `Lifting the areas below target up to the guide level for your stage would move your overall score from ${overall} to ${potential}. Your 7-, 30- and 90-day plan shows the way.`,
      talk: 'Close with the path, not the problem. Walk through the 90-day plan, then offer the follow-up call to agree the first three fixes together.',
      ask: 'If we could fix just one of these in the next 90 days, which would make the biggest difference to you?',
    });
  } else {
    points.push({
      id: 'opportunity',
      tone: 'good',
      icon: 'TrendingUp',
      label: 'The opportunity',
      big: 'Protect & grow',
      headline: unscored > 0
        ? 'Every area you answered is at or above the guide level'
        : 'Every area is at or above the guide level for your stage',
      detail:
        'The job now is to keep these foundations strong while you grow — and lift the areas with the most room left.' +
        (unscored > 0 ? ` ${unscored} area${unscored === 1 ? " wasn't" : "s weren't"} answered — complete ${unscored === 1 ? 'it' : 'them'} for the full picture.` : ''),
      talk: 'Celebrate this. Then focus the conversation on growth goals and the area with the most headroom.',
      ask: 'What would you do with the extra time and cash if the business ran itself for a month?',
    });
  }

  return points;
}

// ── Everything together ─────────────────────────────────────

export function computeResults(profile: Profile, answers: Answers): Results {
  const ctx: Ctx = { profile, answers };
  const sections = SECTIONS.map((s) => scoreSection(s.id, ctx));
  const scored = sections.filter((s) => s.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.score!, 0) / scored.length) : null;

  const bySeverity = (a: Insight, b: Insight) => b.severity - a.severity;
  const allGaps = sections.flatMap((s) => s.gaps).sort(bySeverity);
  const allWatch = sections.flatMap((s) => s.watch).sort(bySeverity);
  const allStrengths = sections
    .flatMap((s) => s.strengths)
    .sort((a, b) => b.score * b.weight - a.score * a.weight);

  const actionPlan = buildActionPlan(allGaps, allWatch);
  const realGap = findRealGap(sections, profile);
  const band = healthBand(overall);

  const asked = sections.reduce((n, s) => n + s.asked, 0);
  const answered = sections.reduce((n, s) => n + s.answered, 0);
  const skipped = sections.reduce((n, s) => n + s.skipped, 0);
  const quickWins = allGaps.filter((g) => g.effort === 'quick').length;

  const name = profile.businessName.trim() || 'Your business';
  const best = [...scored].sort((a, b) => b.score! - a.score!)[0];
  const summary =
    overall === null
      ? `${name} hasn't answered enough questions yet to build a full picture.`
      : `${name} scores ${overall} out of 100 — ${band.label.toLowerCase()}. ` +
        (best ? `Your strongest area is ${best.title} (${best.score}). ` : '') +
        (realGap ? `The area holding you back most is ${realGap.actual.title} (${realGap.actual.score}). ` : '') +
        `We found ${allStrengths.length} strength${allStrengths.length === 1 ? '' : 's'} to build on and ${allGaps.length} gap${allGaps.length === 1 ? '' : 's'} worth fixing` +
        (quickWins ? ` — ${quickWins} of them ${quickWins === 1 ? 'is a quick win' : 'are quick wins'} you can start this week.` : '.');

  const potential = potentialScore(sections);
  const keyPoints = buildKeyPoints({
    profile,
    overall,
    potential,
    band,
    target: targetFor(profile),
    levelLabel: levelLabel(profile),
    sections,
    gaps: allGaps,
    realGap,
    actionPlan,
    quickWins,
  });

  return {
    businessName: name,
    overall,
    band,
    target: targetFor(profile),
    levelLabel: levelLabel(profile),
    industryLabel: industryLabel(profile),
    teamLabel: teamLabel(profile),
    sections,
    strengths: allStrengths.slice(0, 6),
    gaps: allGaps.slice(0, 6),
    realGap,
    actionPlan,
    summary,
    keyPoints,
    potential,
    stats: {
      asked,
      answered,
      skipped,
      strengths: allStrengths.length,
      gaps: allGaps.length,
      quickWins,
    },
  };
}
