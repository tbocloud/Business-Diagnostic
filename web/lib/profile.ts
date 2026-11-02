import type { IndustryId, LevelId, Profile, SectionId, TeamSizeId } from './types';

// ─────────────────────────────────────────────────────────────
// "About your business" — the first step. These answers shape
// which questions are asked, the wording, and the score targets.
// ─────────────────────────────────────────────────────────────

export interface Choice<T extends string = string> {
  id: T;
  label: string;
  /** Short secondary line under the label. */
  hint?: string;
  /** lucide-react icon name (optional, for option cards). */
  icon?: string;
}

export const INDUSTRIES: Choice<IndustryId>[] = [
  { id: 'retail', label: 'Retail & e-commerce', hint: 'Shops, online stores', icon: 'ShoppingBag' },
  { id: 'food', label: 'Restaurant, café & food', hint: 'Dine-in, delivery, catering', icon: 'UtensilsCrossed' },
  { id: 'services', label: 'Professional services', hint: 'Consulting, legal, accounting, agencies', icon: 'Briefcase' },
  { id: 'healthcare', label: 'Healthcare & wellness', hint: 'Clinics, dental, salons, fitness', icon: 'Stethoscope' },
  { id: 'manufacturing', label: 'Manufacturing & production', hint: 'Factories, workshops', icon: 'Factory' },
  { id: 'trading', label: 'Trading & distribution', hint: 'Wholesale, import/export', icon: 'Truck' },
  { id: 'construction', label: 'Construction & real estate', hint: 'Contractors, interiors, property', icon: 'HardHat' },
  { id: 'education', label: 'Education & training', hint: 'Schools, coaching, courses', icon: 'GraduationCap' },
  { id: 'hospitality', label: 'Hospitality & travel', hint: 'Hotels, homestays, tours', icon: 'BedDouble' },
  { id: 'tech', label: 'Technology & software', hint: 'IT services, SaaS, apps', icon: 'Laptop' },
];

export const LEVELS: Choice<LevelId>[] = [
  { id: 'starting', label: 'Just starting', hint: 'Under 1 year — finding the first customers', icon: 'Sprout' },
  { id: 'growing', label: 'Growing', hint: '1–3 years — steady customers, building systems', icon: 'TrendingUp' },
  { id: 'established', label: 'Established', hint: '3–10 years — stable, ready to improve', icon: 'Building2' },
  { id: 'scaling', label: 'Expanding', hint: '10+ years or several branches/markets', icon: 'Rocket' },
];

export const TEAM_SIZES: Choice<TeamSizeId>[] = [
  { id: 'solo', label: 'Just me' },
  { id: 'small', label: '2–10 people' },
  { id: 'medium', label: '11–50 people' },
  { id: 'large', label: '51–200 people' },
  { id: 'xlarge', label: '200+ people' },
];

/** "What's your biggest headache right now?" — mapped to the sections where that pain usually starts. */
export const HEADACHES: (Choice & { sections: SectionId[] })[] = [
  { id: 'sales', label: 'Not enough {customers} or sales', sections: ['sales', 'marketing'], icon: 'TrendingDown' },
  { id: 'cash', label: 'Cash flow is always tight', sections: ['finance'], icon: 'Wallet' },
  { id: 'profit', label: 'Busy, but not making enough profit', sections: ['finance', 'strategy'], icon: 'PiggyBank' },
  { id: 'owner', label: 'Everything depends on me', sections: ['operations', 'team'], icon: 'UserRound' },
  { id: 'chaos', label: 'Things feel disorganised — mistakes keep happening', sections: ['operations', 'technology'], icon: 'Shuffle' },
  { id: 'people', label: 'Finding and keeping good people', sections: ['team'], icon: 'Users' },
  { id: 'manual', label: 'Too much manual work and paperwork', sections: ['technology', 'operations'], icon: 'FileStack' },
  { id: 'retention', label: "{Customers} don't come back", sections: ['customers', 'sales'], icon: 'HeartCrack' },
  { id: 'direction', label: 'Not sure how to grow from here', sections: ['strategy'], icon: 'Compass' },
];

export const GOALS: Choice[] = [
  { id: 'sales', label: 'Increase sales', icon: 'TrendingUp' },
  { id: 'profit', label: 'Improve profit', icon: 'PiggyBank' },
  { id: 'organised', label: 'Get more organised', icon: 'ListChecks' },
  { id: 'team', label: 'Build a stronger team', icon: 'Users' },
  { id: 'digital', label: 'Go digital / automate', icon: 'Zap' },
  { id: 'expand', label: 'Expand to new locations or markets', icon: 'MapPin' },
  { id: 'time', label: 'Free up my own time', icon: 'Clock' },
  { id: 'exit', label: 'Prepare to raise funds or sell', icon: 'Handshake' },
];

// ── Score targets by business stage ─────────────────────────
// A starting business isn't expected to have the systems of a 10-year-old one.
// These are guide targets for the dashboard, not industry statistics.
export const LEVEL_TARGETS: Record<LevelId, number> = {
  starting: 50,
  growing: 60,
  established: 70,
  scaling: 78,
};
export const DEFAULT_TARGET = 60;

export function targetFor(profile: Profile): number {
  return profile.level ? LEVEL_TARGETS[profile.level] : DEFAULT_TARGET;
}

// ── Industry vocabulary ─────────────────────────────────────
// Questions say {customers}; a clinic sees "patients", a school sees "students".
interface Vocab {
  customer: string;
  customers: string;
  offering: string;
  place: string;
}

const VOCAB: Record<IndustryId, Vocab> = {
  retail: { customer: 'customer', customers: 'customers', offering: 'products', place: 'store' },
  food: { customer: 'customer', customers: 'customers', offering: 'menu items', place: 'outlet' },
  services: { customer: 'client', customers: 'clients', offering: 'services', place: 'office' },
  healthcare: { customer: 'patient', customers: 'patients', offering: 'services', place: 'clinic' },
  manufacturing: { customer: 'buyer', customers: 'buyers', offering: 'products', place: 'factory' },
  trading: { customer: 'buyer', customers: 'buyers', offering: 'products', place: 'warehouse' },
  construction: { customer: 'client', customers: 'clients', offering: 'projects', place: 'site' },
  education: { customer: 'student', customers: 'students', offering: 'courses', place: 'centre' },
  hospitality: { customer: 'guest', customers: 'guests', offering: 'stays and services', place: 'property' },
  tech: { customer: 'client', customers: 'clients', offering: 'products and services', place: 'office' },
  other: { customer: 'customer', customers: 'customers', offering: 'products or services', place: 'business' },
};

/** Replace {customer} {customers} {offering} {place} tokens. `{Customers}` gives Title case. */
export function fill(text: string, profile: Pick<Profile, 'industry'>): string {
  const v = VOCAB[profile.industry ?? 'other'];
  return text.replace(/\{(customer|customers|offering|place)\}/gi, (_m, key: string) => {
    const word = v[key.toLowerCase() as keyof Vocab];
    return key[0] === key[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;
  });
}

export function industryLabel(profile: Profile): string {
  if (profile.industry === 'other') return profile.industryOther?.trim() || 'Other';
  return INDUSTRIES.find((i) => i.id === profile.industry)?.label ?? 'Not specified';
}

export function levelLabel(profile: Profile): string {
  return LEVELS.find((l) => l.id === profile.level)?.label ?? 'Not specified';
}

export function teamLabel(profile: Profile): string {
  return TEAM_SIZES.find((t) => t.id === profile.teamSize)?.label ?? 'Not specified';
}

export function headacheLabel(profile: Profile): string | undefined {
  if (!profile.headache) return undefined;
  if (profile.headache === 'other') return profile.headacheOther?.trim() || undefined;
  const h = HEADACHES.find((x) => x.id === profile.headache);
  return h ? fill(h.label, profile) : undefined;
}

export const EMPTY_PROFILE: Profile = { businessName: '', goals: [] };

// Everything in "About your business" is optional. Without an industry the wording stays
// generic; without a stage the target is DEFAULT_TARGET; without a team size team questions are asked.

/** Number of blocks on the "About your business" form (name + 5 choice questions). */
export const PROFILE_BLOCKS = 6;

/** How many of the profile blocks the client has filled in. */
export function profileAnsweredCount(p: Profile): number {
  return [
    p.businessName.trim().length > 0,
    !!p.industry && (p.industry !== 'other' || !!p.industryOther?.trim()),
    !!p.level,
    !!p.teamSize,
    !!p.headache && (p.headache !== 'other' || !!p.headacheOther?.trim()),
    p.goals.length > 0 || !!p.goalsOther?.trim(),
  ].filter(Boolean).length;
}
