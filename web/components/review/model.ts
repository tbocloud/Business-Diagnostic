import { contactLinks } from '@/components/results/ContactCta';
import { BRAND } from '@/lib/brand';
import type { KeyPoint, Results } from '@/lib/types';

export type Slide =
  | { kind: 'title'; label: string; say: string; ask?: string }
  | { kind: 'point'; label: string; point: KeyPoint; n: number; say: string; ask?: string }
  | { kind: 'plan'; label: string; say: string; ask?: string }
  | { kind: 'help'; label: string; say: string; ask?: string }
  | { kind: 'contact'; label: string; say: string; ask?: string };

/** Title → one slide per key point (3–6) → plan → how we help (if any service applies) → contact (if set). */
export function buildSlides(results: Results): Slide[] {
  const points = results.keyPoints;
  const slides: Slide[] = [
    {
      kind: 'title',
      label: results.businessName,
      say: `Thank them for their time. Set the agenda: ${points.length} key points from their answers, then the first steps — about ten minutes. Their answers stay private.`,
      ask: 'Before we start — what would make this conversation useful for you today?',
    },
    ...points.map((point, i): Slide => ({ kind: 'point', label: point.label, point, n: i + 1, say: point.talk, ask: point.ask })),
    {
      kind: 'plan',
      label: 'Your plan',
      say: 'Start with “This week”. Agree one action, who owns it and a date before you finish. Then show how the 30- and 90-day items build on it.',
      ask: 'Which of these feels most doable this week?',
    },
  ];
  if (results.services.length) {
    const top = results.services[0];
    slides.push({
      kind: 'help',
      label: `How ${BRAND.company} helps`,
      say: `Link each service to THEIR gaps, not to features. Lead with ${BRAND.services[top.id].long}: it covers ${top.items.length} of the issues we found, starting with “${top.items[0].title.toLowerCase()}”. Offer a short demo on their own data.`,
      ask: 'Which of these would make the biggest difference to you in the next three months?',
    });
  }
  if (contactLinks(results.businessName).length) {
    slides.push({
      kind: 'contact',
      label: 'Next step',
      say: 'Offer the free follow-up call to agree the first three fixes together. Book it before you leave if you can.',
      ask: 'Shall we put a time in the diary now?',
    });
  }
  return slides;
}
