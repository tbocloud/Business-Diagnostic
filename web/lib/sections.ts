import type { Section, SectionId } from './types';

// The order here is the order the client walks through.
export const SECTIONS: Section[] = [
  {
    id: 'sales',
    title: 'Sales & Revenue',
    short: 'Sales',
    icon: 'TrendingUp',
    intro: 'How new {customers} find their way to you, and how reliably interest turns into money.',
    rootNote:
      'When sales depend on luck, referrals or one person, everything downstream — cash, hiring, planning — becomes unpredictable.',
    bdeAsk: [
      "Out of the last 10 people who enquired, how many bought — and what happened to the rest?",
      "If your best source of new {customers} went quiet next month, where would sales come from?",
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Online Presence',
    short: 'Marketing',
    icon: 'Megaphone',
    intro: 'Whether the right people can find you, trust you, and understand why you are the better choice.',
    rootNote:
      "When the right people can't find you or don't see why you're different, even a great business stays a well-kept secret — and competes on price.",
    bdeAsk: [
      "If I searched for your kind of business nearby right now, would I find you before your competitors?",
      "Why do your best {customers} choose you over others — in their own words?",
    ],
  },
  {
    id: 'customers',
    title: 'Customer Experience',
    short: 'Customers',
    icon: 'HeartHandshake',
    intro: 'What it feels like to be your {customer} — and whether they come back and bring friends.',
    rootNote:
      "When {customers} aren't listened to or followed up, they quietly drift away — and you keep paying to replace them.",
    bdeAsk: [
      "When did a {customer} last stop coming to you — and do you know why?",
      "How long does it usually take to reply to a new enquiry?",
    ],
  },
  {
    id: 'operations',
    title: 'Operations & Daily Work',
    short: 'Operations',
    icon: 'Workflow',
    intro: 'How smoothly the day-to-day work runs — and how much of it depends on you.',
    rootNote:
      'When daily work lives in people\'s heads and chat messages, mistakes repeat, the owner becomes the bottleneck, and growth adds chaos instead of profit.',
    bdeAsk: [
      "What happens to the business on a day you're unwell or travelling?",
      "Which mistake keeps coming back again and again?",
    ],
  },
  {
    id: 'finance',
    title: 'Money & Profit',
    short: 'Money',
    icon: 'Wallet',
    intro: 'Whether you can see your real profit, protect your cash, and price for a healthy margin.',
    rootNote:
      "When the numbers aren't clear, it's possible to be busy every day and still be short of cash — and big decisions become guesses.",
    bdeAsk: [
      "If you had to guess, what was your profit last month — and how sure are you?",
      "Which bills cause the most stress at the end of the month?",
    ],
  },
  {
    id: 'team',
    title: 'Team & People',
    short: 'Team',
    icon: 'Users',
    intro: 'Whether the right people are in the right roles, know what good looks like, and want to stay.',
    rootNote:
      'When roles, training and feedback are unclear, good people leave — and the owner ends up doing everyone\'s job.',
    bdeAsk: [
      "If your best person left tomorrow, what would break first?",
      "How do new joiners learn the job today?",
    ],
  },
  {
    id: 'technology',
    title: 'Tools & Technology',
    short: 'Tools',
    icon: 'MonitorSmartphone',
    intro: 'Whether your tools save you time — or whether work still runs on paper, chats and re-typing.',
    rootNote:
      'When work runs on paper, chats and re-typing, hours disappear into admin and small mistakes slip through to {customers}.',
    bdeAsk: [
      "How many hours a week does your team spend typing the same information twice?",
      "Which daily task feels most like a waste of time?",
    ],
  },
  {
    id: 'strategy',
    title: 'Planning & Growth',
    short: 'Planning',
    icon: 'Compass',
    intro: 'Whether there is a clear direction — and time set aside to steer towards it.',
    rootNote:
      'When there is no clear plan and the owner is always firefighting, the business drifts — busy every day, but not really moving forward.',
    bdeAsk: [
      "Where do you want the business to be 12 months from now — in numbers?",
      "Last week, how many hours did you spend planning rather than firefighting?",
    ],
  },
];

export const SECTION_BY_ID: Record<SectionId, Section> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<SectionId, Section>;
