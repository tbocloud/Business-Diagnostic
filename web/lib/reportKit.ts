import { GAP_BELOW, healthBand, STRENGTH_AT } from './engine';
import type {
  ActionItem,
  Effort,
  Insight,
  KeyPoint,
  NumberFact,
  RealGap,
  Results,
  SectionId,
  SectionResult,
  SectionStatus,
  ServiceId,
  ServiceRecommendation,
  Solution,
} from './types';

// ─────────────────────────────────────────────────────────────
// One report for every check. Stage 2 and the ERP check turn their scored answers into the
// same Results as Stage 1, so they get the same report: score, area bars with "What to do",
// key points, the real gap, strengths and gaps, the 7/30/90-day plan and "How we help".
// ─────────────────────────────────────────────────────────────

export interface KitArea {
  id: string;
  title: string;
  short: string;
  icon: string;
  /** How a weakness here shows up across the business (the real-gap story). */
  rootNote: string;
}

export interface KitFinding {
  questionId: string;
  area: string;
  /** 0–100. */
  score: number;
  weight?: 1 | 2 | 3;
  /** What they answered, as they would say it. */
  answerLabel: string;
  strength: string;
  gap: string;
  why: string;
  /** The first step to take. */
  fix: string;
  steps: string[];
  effort: Effort;
  /** How our services close it. */
  solution?: Solution;
}

export interface KitInput {
  businessName: string;
  /** Target score for every area. */
  target: number;
  /** "a well-run business" in the report's sentences comes from this ("well-run"). */
  levelLabel: string;
  industryLabel: string;
  teamLabel: string;
  areas: KitArea[];
  findings: KitFinding[];
  asked: number;
  answered: number;
  skipped: number;
  numbers?: NumberFact[];
  /** "System" → "System health" (the first key point). */
  scoreLabel: string;
  /** Replaces the "opportunity" key point (e.g. Stage 2's biggest idea in rupees). */
  opportunity?: Omit<KeyPoint, 'id'>;
  /** Above the score, e.g. "System health" (default "Overall health"). */
  scoreTitle?: string;
}

const STATUS_LABEL: Record<SectionStatus, string> = {
  healthy: 'Healthy',
  push: 'Needs a push',
  priority: 'Priority gap',
  'not-assessed': 'Not assessed',
};
// "GST returns…" stays as it is; "Stock in the books…" → "stock in the books…".
const lower = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

export function buildResults(k: KitInput): Results {
  const insightsByArea = new Map<string, Insight[]>();
  const areaById = new Map(k.areas.map((a) => [a.id, a]));
  for (const f of k.findings) {
    const area = areaById.get(f.area);
    if (!area) continue;
    const weight = f.weight ?? 2;
    const kind = f.score >= STRENGTH_AT ? 'strength' : f.score < GAP_BELOW ? 'gap' : 'watch';
    const insight: Insight = {
      questionId: f.questionId,
      section: f.area as SectionId,
      kind,
      title: kind === 'strength' ? f.strength : f.gap,
      answerLabel: f.answerLabel,
      why: f.why,
      fix: f.fix,
      steps: f.steps,
      solution: f.solution,
      effort: f.effort,
      score: f.score,
      weight,
      severity: (100 - f.score) * weight,
      sectionTitle: area.title,
      sectionIcon: area.icon,
    };
    insightsByArea.set(f.area, [...(insightsByArea.get(f.area) ?? []), insight]);
  }

  const bySeverity = (a: Insight, b: Insight) => b.severity - a.severity;
  const byStrength = (a: Insight, b: Insight) => b.score * b.weight - a.score * a.weight;
  const sections: SectionResult[] = k.areas.map((a) => {
    const list = insightsByArea.get(a.id) ?? [];
    const weights = list.reduce((n, i) => n + i.weight, 0);
    const score = weights ? Math.round(list.reduce((n, i) => n + i.score * i.weight, 0) / weights) : null;
    const status: SectionStatus = score === null ? 'not-assessed' : score >= k.target ? 'healthy' : score >= k.target - 12 ? 'push' : 'priority';
    const gaps = list.filter((i) => i.kind === 'gap').sort(bySeverity);
    const watch = list.filter((i) => i.kind === 'watch').sort(bySeverity);
    const strengths = list.filter((i) => i.kind === 'strength').sort(byStrength);
    const worst = gaps[0] ?? watch[0];
    const note =
      score === null
        ? 'Not enough answers to score this area.'
        : worst
          ? `${a.title}: ${score}/100. The biggest issue here — ${lower(worst.title)}.`
          : `${a.title}: ${score}/100 — working well${strengths[0] ? `: ${lower(strengths[0].title)}` : ''}.`;
    return {
      id: a.id as SectionId,
      title: a.title,
      short: a.short,
      icon: a.icon,
      score,
      target: k.target,
      status,
      statusLabel: STATUS_LABEL[status],
      asked: list.length,
      answered: list.length,
      skipped: 0,
      strengths,
      watch,
      gaps,
      ownWords: [],
      note,
    };
  });

  const scored = sections.filter((s) => s.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((n, s) => n + s.score!, 0) / scored.length) : null;
  const band = healthBand(overall);
  const allGaps = sections.flatMap((s) => s.gaps).sort(bySeverity);
  const allWatch = sections.flatMap((s) => s.watch).sort(bySeverity);
  const allStrengths = sections.flatMap((s) => s.strengths).sort(byStrength);

  // ── The real gap: the area furthest below target ──
  let realGap: RealGap | null = null;
  if (scored.length) {
    const actual = [...scored].sort((a, b) => a.score! - a.target - (b.score! - b.target) || a.score! - b.score!)[0];
    const best = [...scored].sort((a, b) => b.score! - a.score!)[0];
    const topIssue = actual.gaps[0] ?? actual.watch[0];
    const root = areaById.get(actual.id)?.rootNote ?? '';
    realGap = {
      actual,
      match: null,
      headline: actual.score! >= actual.target ? `No major gaps — your next opportunity is ${actual.title}` : `Your real gap: ${actual.title}`,
      story: `${actual.title} scored ${actual.score}/100 against a target of ${actual.target}. ${root}${topIssue ? ` The biggest single issue here: ${lower(topIssue.title)}.` : ''}`,
      topIssue,
      hiddenStrength: best.id !== actual.id && best.score! >= best.target ? best : undefined,
    };
  }

  // ── The 7 / 30 / 90-day plan ──
  const pool = [...allGaps, ...allWatch];
  const toItem = (i: Insight): ActionItem => ({ title: i.title, fix: i.fix, section: i.section, sectionTitle: i.sectionTitle ?? '', sectionIcon: i.sectionIcon, effort: i.effort });
  const pick = (effort: Effort) => pool.filter((i) => i.effort === effort).slice(0, 4).map(toItem);
  const actionPlan = { week: pick('quick'), month: pick('medium'), quarter: pick('big') };
  const quickWins = allGaps.filter((g) => g.effort === 'quick').length;

  const potential = scored.length ? Math.round(scored.reduce((n, s) => n + Math.max(s.score!, s.target), 0) / scored.length) : null;

  // ── Our services ──
  const recs = new Map<ServiceId, ServiceRecommendation>();
  for (const i of pool) {
    for (const id of i.solution?.services ?? []) {
      const rec = recs.get(id) ?? { id, weight: 0, items: [] };
      rec.weight += i.kind === 'gap' ? i.severity : i.severity / 2;
      rec.items.push({ questionId: i.questionId, title: i.title, sectionTitle: i.sectionTitle ?? '', kind: i.kind === 'gap' ? 'gap' : 'watch' });
      recs.set(id, rec);
    }
  }
  const services = [...recs.values()].sort((a, b) => b.weight - a.weight);

  // ── Key points ──
  const best = [...scored].sort((a, b) => b.score! - a.score!)[0];
  const issue = allGaps[0] ?? allWatch[0];
  const firstQuick = actionPlan.week[0];
  const keyPoints: KeyPoint[] = [];
  if (overall !== null) {
    keyPoints.push({
      id: 'score',
      tone: band.tone === 'great' || band.tone === 'good' ? 'good' : band.tone === 'fair' ? 'warn' : 'gap',
      icon: 'Gauge',
      label: `${k.scoreLabel} health`,
      big: `${overall}/100`,
      headline: band.label,
      detail: `${band.blurb} Based on ${scored.length} of ${k.areas.length} areas.`,
      talk: `Start with the overall picture: ${overall} out of 100 against a target of ${k.target}. Then open the area that is furthest behind.`,
    });
  }
  // What's working: an area at its target — or else the best single answer, if one is strong.
  const topStrength = allStrengths[0];
  if (best && best.score! >= k.target) {
    keyPoints.push({
      id: 'strength',
      tone: 'good',
      icon: 'Sparkles',
      label: 'What’s working best',
      big: best.title,
      headline: `Your strongest area at ${best.score}/100`,
      detail: best.strengths[0] ? `${best.strengths[0].title}.` : best.note,
      talk: 'Open with what is working — it earns the right to talk about the gaps.',
      section: best.id,
      said: best.strengths[0]?.answerLabel,
    });
  } else if (topStrength) {
    keyPoints.push({
      id: 'strength',
      tone: 'good',
      icon: 'Sparkles',
      label: 'What’s working best',
      big: topStrength.title,
      headline: `Inside ${topStrength.sectionTitle}`,
      detail: 'Build on this — the rest of the plan stands on what already works.',
      talk: 'Open with what is working — it earns the right to talk about the gaps.',
      section: topStrength.section,
      said: topStrength.answerLabel,
    });
  }
  if (realGap) {
    keyPoints.push({
      id: 'realgap',
      tone: realGap.actual.score! >= realGap.actual.target ? 'neutral' : 'gap',
      icon: 'Target',
      label: 'The real gap',
      big: realGap.actual.title,
      headline: realGap.headline,
      detail: `${realGap.actual.score}/100 against a target of ${realGap.actual.target}. ${areaById.get(realGap.actual.id)?.rootNote ?? ''}`,
      talk: 'This is the area to fix first — everything else gets easier once it works.',
      section: realGap.actual.id,
    });
  }
  if (issue) {
    keyPoints.push({
      id: 'issue',
      tone: 'gap',
      icon: 'AlertTriangle',
      label: 'Most urgent issue',
      big: issue.title,
      headline: `Inside ${issue.sectionTitle}`,
      detail: issue.why,
      talk: 'Ask how this shows up day to day — let them tell you what it costs.',
      section: issue.section,
      said: issue.answerLabel,
    });
  }
  if (firstQuick) {
    keyPoints.push({
      id: 'quickwin',
      tone: 'action',
      icon: 'Zap',
      label: 'Start this week',
      big: quickWins > 1 ? `${quickWins} quick wins` : quickWins === 1 ? '1 quick win' : 'First step',
      headline: firstQuick.fix,
      detail: `This tackles: ${lower(firstQuick.title)} (${firstQuick.sectionTitle}).`,
      talk: 'Leave them with one thing they can do this week, with or without us.',
      section: firstQuick.section,
    });
  }
  if (k.opportunity) keyPoints.push({ id: 'opportunity', ...k.opportunity });
  else if (overall !== null && potential !== null && potential > overall) {
    keyPoints.push({
      id: 'opportunity',
      tone: 'neutral',
      icon: 'TrendingUp',
      label: 'The opportunity',
      big: `${overall} → ${potential}`,
      headline: 'Where your score goes when every area reaches its target',
      detail: `Lifting the areas below target to ${k.target} would move the overall score from ${overall} to ${potential}. The plan below shows the way.`,
      talk: 'End on where they could be — and the first step to get there.',
    });
  }

  const name = k.businessName.trim() || 'Your business';
  const summary =
    overall === null
      ? `${name} hasn’t answered enough questions yet to build a full picture.`
      : `${name} scores ${overall} out of 100 — ${band.label.toLowerCase()}. ` +
        (best && best.score! >= GAP_BELOW ? `The strongest area is ${best.title} (${best.score}). ` : '') +
        (realGap && realGap.actual.score! < realGap.actual.target ? `The area holding you back most is ${realGap.actual.title} (${realGap.actual.score}). ` : '') +
        `We found ${allStrengths.length} strength${allStrengths.length === 1 ? '' : 's'} and ${allGaps.length} gap${allGaps.length === 1 ? '' : 's'}` +
        (quickWins ? ` — ${quickWins} of them ${quickWins === 1 ? 'is a quick win' : 'are quick wins'} you can start this week.` : '.');

  return {
    businessName: name,
    overall,
    band,
    target: k.target,
    levelLabel: k.levelLabel,
    industryLabel: k.industryLabel,
    teamLabel: k.teamLabel,
    sections,
    strengths: allStrengths.slice(0, 6),
    gaps: allGaps.slice(0, 6),
    realGap,
    actionPlan,
    summary,
    labels: { score: k.scoreTitle ?? 'Overall health', target: 'Target' },
    keyPoints,
    potential,
    services,
    numbers: k.numbers ?? [],
    stats: { asked: k.asked, answered: k.answered, skipped: k.skipped, strengths: allStrengths.length, gaps: allGaps.length, quickWins },
  };
}
