import { SECTIONS } from './sections';
import type { Answer, Answers, OpenSignals, SectionId, ServiceId } from './types';

// What the client described in the last, open step becomes tags inside `answers`, e.g.
// { selected: ['area:finance', 'svc:erp'] }. Tags only — never the client's words — so they
// travel with the answers to every report view (own device, #r= share link, CRM link, BDE
// panel) and the report quietly ranks gaps and services by them, without quoting anything.

export const OPEN_SIGNALS_ID = 'open_signals';

const SECTION_IDS = SECTIONS.map((s) => s.id);
const SERVICE_IDS: ServiceId[] = ['erp', 'marketing', 'ai'];

const unique = <T,>(xs: T[]) => [...new Set(xs)];

/** The tags in `answers`, keeping only known areas and services (the data may come from a share link). */
export function readOpenSignals(answers: Answers): OpenSignals {
  const picked = answers[OPEN_SIGNALS_ID]?.selected ?? [];
  return {
    areas: unique(
      picked.filter((t) => t.startsWith('area:')).map((t) => t.slice(5) as SectionId).filter((id) => SECTION_IDS.includes(id)),
    ),
    services: unique(
      picked.filter((t) => t.startsWith('svc:')).map((t) => t.slice(4) as ServiceId).filter((id) => SERVICE_IDS.includes(id)),
    ),
  };
}

/** The answer that stores `signals` (store it under OPEN_SIGNALS_ID). */
export function openSignalsAnswer(signals: OpenSignals): Answer {
  return { selected: [...signals.areas.map((a) => `area:${a}`), ...signals.services.map((s) => `svc:${s}`)] };
}
