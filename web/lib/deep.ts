import { type FormAnswers, type FormCtx, type FormSection, num, picked, rupees, visibleFields } from './forms';
import type { IndustryId, ServiceId } from './types';

// ─────────────────────────────────────────────────────────────
// STAGE 2 — "Your real numbers". Taken after Stage 1, with the business's own figures:
// which stage it is really at, the profit picture, growth ideas worth money, how good
// its customers are, and its cash. Every question can be skipped; Stage 1 answers on this
// device are reused, so nothing is asked twice.
// ─────────────────────────────────────────────────────────────

const askedInStage1 = (id: string) => (c: FormCtx) => typeof c.stage1[id]?.value === 'number';
const notInStage1 = (id: string) => (c: FormCtx) => !askedInStage1(id)(c);
const NOT_SURE = [{ id: 'unsure', label: 'Not sure' }];

export const DEEP_SECTIONS: FormSection[] = [
  {
    id: 'stage',
    title: 'Where you are now',
    icon: 'Compass',
    intro: 'A few facts about the size of the business — they show which stage you are really at, and what is holding you there.',
    fields: [
      { id: 'deep_sales', kind: 'number', text: 'What are your total sales in an average month?', hint: 'All sales, before any costs. A rough figure is fine.', number: { min: 0, max: 1e10, prefix: '₹', unit: 'a month', placeholder: 'e.g. 500000' }, options: NOT_SURE },
      { id: 'deep_years', kind: 'number', text: 'How many years has the business been running?', number: { min: 0, max: 150, unit: 'years', placeholder: 'e.g. 6' } },
      { id: 'deep_people', kind: 'number', text: 'How many people work in the business, including you?', number: { min: 1, max: 100000, unit: 'people', placeholder: 'e.g. 12' } },
      {
        id: 'deep_systems',
        kind: 'multi',
        text: 'Which of these already run on proper software — not paper, Excel or memory?',
        options: [
          { id: 'accounts', label: 'Accounts and GST' },
          { id: 'billing', label: 'Billing and invoices' },
          { id: 'stock', label: 'Stock and purchases' },
          { id: 'sales', label: 'Enquiries, leads and follow-ups' },
          { id: 'payroll', label: 'Salaries, attendance and leave' },
          { id: 'none', label: 'None of these', exclusive: true },
        ],
      },
    ],
  },
  {
    id: 'profit',
    title: 'Your profit',
    icon: 'PiggyBank',
    intro: 'Where each rupee of sales goes. From this we work out your real profit and the sales you need just to break even.',
    fields: [
      { id: 'deep_direct', kind: 'number', text: 'Out of every ₹100 of sales, how much do you spend buying the goods, materials or work you sell?', hint: 'Only what you buy to make or sell — not rent or salaries.', number: { min: 0, max: 100, prefix: '₹', unit: 'out of every ₹100', placeholder: 'e.g. 60' }, options: NOT_SURE },
      { id: 'deep_salaries', kind: 'number', text: 'Salaries and wages in a month, including your own?', number: { min: 0, max: 1e9, prefix: '₹', unit: 'a month', placeholder: 'e.g. 150000' }, options: NOT_SURE },
      { id: 'deep_overheads', kind: 'number', text: 'Rent, electricity, loan EMIs and other running costs in a month?', hint: 'Everything else you pay every month, apart from salaries and marketing.', number: { min: 0, max: 1e9, prefix: '₹', unit: 'a month', placeholder: 'e.g. 60000' }, options: NOT_SURE },
      { id: 'deep_marketing', kind: 'number', text: 'Marketing in a month?', hint: 'Ads, boosted posts, agency fees, printing.', show: notInStage1('mkt_spend'), number: { min: 0, max: 1e9, prefix: '₹', unit: 'a month', placeholder: 'e.g. 15000' }, options: [{ id: 'nothing', label: 'Nothing' }, ...NOT_SURE] },
    ],
  },
  {
    id: 'growth',
    title: 'Sales and growth',
    icon: 'TrendingUp',
    intro: 'How sales are moving, and the figures behind them — so we can show which growth ideas are worth the most money to you.',
    fields: [
      { id: 'deep_growth', kind: 'number', text: 'By what % have your sales grown — or dropped — compared with last year?', hint: 'Type a minus for a drop, e.g. -10.', number: { min: -100, max: 1000, unit: '% vs last year', placeholder: 'e.g. 12' }, options: NOT_SURE },
      { id: 'deep_avg_sale', kind: 'number', text: 'What is your average bill or order value?', number: { min: 1, max: 1e9, prefix: '₹', unit: 'per sale', placeholder: 'e.g. 4500' }, options: NOT_SURE },
      { id: 'deep_enquiries', kind: 'number', text: 'Roughly how many new enquiries or leads do you get in a month?', show: notInStage1('sales_enquiries'), number: { min: 0, max: 100000, unit: 'a month', placeholder: 'e.g. 40' }, options: NOT_SURE },
      { id: 'deep_convert', kind: 'number', text: 'Out of every 10 enquiries, how many become paying customers?', show: notInStage1('sales_convert'), number: { min: 0, max: 10, unit: 'out of 10', placeholder: 'e.g. 3' }, options: NOT_SURE },
      {
        id: 'deep_price',
        kind: 'single',
        text: 'When did you last raise your prices?',
        options: [
          { id: 'recent', label: 'In the last 6 months' },
          { id: 'year', label: '6–12 months ago' },
          { id: 'old', label: '1–2 years ago' },
          { id: 'never', label: 'More than 2 years ago, or never' },
        ],
      },
    ],
  },
  {
    id: 'customers',
    title: 'Your customers',
    icon: 'Users',
    intro: 'How many customers you have, how many are really good for the business, and how many you lose.',
    fields: [
      { id: 'deep_active', kind: 'number', text: 'How many customers bought from you in the last 3 months?', number: { min: 0, max: 1e7, unit: 'customers', placeholder: 'e.g. 120' }, options: NOT_SURE },
      { id: 'deep_good', kind: 'number', text: 'Out of every 10 customers, how many are “good” ones — they come back, pay on time and don’t haggle hard?', number: { min: 0, max: 10, unit: 'out of 10', placeholder: 'e.g. 4' }, options: NOT_SURE },
      { id: 'deep_top10', kind: 'number', text: 'What % of your sales comes from your 10 biggest customers?', number: { min: 0, max: 100, unit: '%', placeholder: 'e.g. 45' }, options: NOT_SURE },
      { id: 'deep_lost', kind: 'number', text: 'Roughly how many regular customers stopped buying in the last 12 months?', number: { min: 0, max: 1e6, unit: 'customers', placeholder: 'e.g. 8' }, options: NOT_SURE },
    ],
  },
  {
    id: 'cash',
    title: 'Your cash',
    icon: 'Wallet',
    intro: 'Profit on paper is not money in the bank. Two figures show how much cash is stuck outside the business, and how long you could keep going.',
    fields: [
      { id: 'deep_receivable', kind: 'number', text: 'How much do customers owe you right now?', number: { min: 0, max: 1e10, prefix: '₹', unit: 'owed to you', placeholder: 'e.g. 800000' }, options: NOT_SURE },
      { id: 'deep_cash', kind: 'number', text: 'Roughly how much cash is in the bank and in hand right now?', number: { min: 0, max: 1e10, prefix: '₹', unit: 'in cash', placeholder: 'e.g. 250000' }, options: NOT_SURE },
    ],
  },
];

// ── Results ─────────────────────────────────────────────────

export type StageLevel = 1 | 2 | 3 | 4;

export const STAGE_LABELS: Record<StageLevel, { label: string; blurb: string }> = {
  1: { label: 'Starting up', blurb: 'The business runs on the owner’s energy. The job now is steady sales and simple habits for money and records.' },
  2: { label: 'Finding steady ground', blurb: 'Sales are coming in. The next step is making them predictable and getting work out of people’s heads into simple systems.' },
  3: { label: 'Growing', blurb: 'There is real demand. Growth now depends on systems and people who can run the work without you in every detail.' },
  4: { label: 'Ready to scale', blurb: 'A solid base. The next step is repeating what works — new branches, markets or products — on shared systems.' },
};

export interface DeepStage {
  level: StageLevel;
  label: string;
  blurb: string;
  dims: { id: 'sales' | 'team' | 'systems' | 'years'; label: string; level: StageLevel; value: string }[];
  /** The dimension behind the rest, when one clearly is. */
  holdingBack?: { label: string; note: string };
}

export interface DeepProfit {
  sales: number;
  directPct?: number;
  fixed: number;
  /** Net profit a month (after direct costs and the fixed costs given). */
  net?: number;
  netPct?: number;
  breakEven?: number;
  /** A healthy net margin for this kind of business (%), for comparison. */
  healthyPct: number;
  /** Where every ₹100 of sales goes. */
  split: { label: string; amount: number; tone: 'cost' | 'profit' | 'loss' }[];
}

export interface GrowthLever {
  id: string;
  title: string;
  /** ₹ a month (or once, for cash freed). */
  amount: number;
  per: 'month' | 'once';
  note: string;
  /** One concrete thing to do this month. */
  firstStep: string;
  service: ServiceId;
}

export interface DeepCustomers {
  active?: number;
  good?: number;
  perCustomer?: number;
  top10?: number;
  churnPct?: number;
  notes: string[];
}

export interface DeepCash {
  receivable?: number;
  receivableDays?: number;
  payable?: number;
  cash?: number;
  runwayMonths?: number;
  notes: string[];
}

export interface DeepResults {
  stage: DeepStage | null;
  profit: DeepProfit | null;
  levers: GrowthLever[];
  customers: DeepCustomers | null;
  cash: DeepCash | null;
  growth?: number;
  /** Short points for the team (CRM: Stage 2 summary). */
  points: string[];
  answered: number;
  asked: number;
}

const band = (n: number, limits: [number, number, number]): StageLevel => (n < limits[0] ? 1 : n < limits[1] ? 2 : n < limits[2] ? 3 : 4);
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/** Industries where a thin margin per sale is normal (same as Stage 1's profit question). */
const LOW_MARGIN: IndustryId[] = ['retail', 'food', 'trading', 'manufacturing', 'construction'];

export function computeDeep(answers: FormAnswers, stage1: FormAnswers, industry?: IndustryId): DeepResults {
  const ctx: FormCtx = { answers, stage1 };
  const v = (id: string) => num(answers, id);
  const s1 = (id: string) => num(stage1, id);

  const sales = v('deep_sales');
  const avgSale = v('deep_avg_sale');
  const enquiries = v('deep_enquiries') ?? s1('sales_enquiries');
  const convert = v('deep_convert') ?? s1('sales_convert');
  const marketing = v('deep_marketing') ?? s1('mkt_spend') ?? (picked(answers, 'deep_marketing').includes('nothing') ? 0 : undefined);
  const emi = v('deep_emi') ?? (picked(answers, 'deep_emi').includes('none') ? 0 : undefined);

  // ── Stage ──
  const dims: DeepStage['dims'] = [];
  if (sales !== undefined) dims.push({ id: 'sales', label: 'Sales', level: band(sales * 12, [20e5, 1e7, 1e8]), value: `${rupees(sales * 12)} a year` });
  const people = v('deep_people');
  if (people !== undefined) dims.push({ id: 'team', label: 'Team', level: band(people, [4, 16, 61]), value: `${people} people` });
  const systemsAnswer = answers.deep_systems;
  if (systemsAnswer && !systemsAnswer.skipped && systemsAnswer.selected.length) {
    const count = systemsAnswer.selected.filter((s) => s !== 'none').length;
    dims.push({ id: 'systems', label: 'Systems', level: (count <= 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4) as StageLevel, value: `${count} of 5 on software` });
  }
  const years = v('deep_years');
  if (years !== undefined) dims.push({ id: 'years', label: 'Experience', level: band(years, [2, 5, 10]), value: `${years} year${years === 1 ? '' : 's'}` });
  const weights = { sales: 2, team: 1.5, systems: 1, years: 0.5 };
  const weightSum = dims.reduce((n, d) => n + weights[d.id], 0);
  let stage: DeepStage | null = null;
  if (dims.length >= 2) {
    const level = Math.min(4, Math.max(1, Math.round(dims.reduce((n, d) => n + d.level * weights[d.id], 0) / weightSum))) as StageLevel;
    const lowest = [...dims].sort((a, b) => a.level - b.level)[0];
    const HOLDING: Record<DeepStage['dims'][number]['id'], string> = {
      systems: 'Your systems are behind your size. Work still runs on paper, sheets and memory — that is what keeps a business from the next stage.',
      team: 'The team is small for the size of the business, so too much rests on too few people — usually you.',
      sales: 'Your setup is ahead of your sales. Growing sales is the next job; the base to handle it is already there.',
      years: 'You have grown fast for a young business — the risk is processes that haven’t caught up.',
    };
    stage = {
      level,
      ...STAGE_LABELS[level],
      dims,
      holdingBack: lowest.level < level ? { label: lowest.label, note: HOLDING[lowest.id] } : undefined,
    };
  }

  // ── Profit ──
  let profit: DeepProfit | null = null;
  const direct = v('deep_direct');
  const salaries = v('deep_salaries');
  const overheads = v('deep_overheads');
  if (sales !== undefined && sales > 0) {
    const fixedParts = [salaries, overheads, marketing, emi].filter((x): x is number => x !== undefined);
    const fixed = fixedParts.reduce((n, x) => n + x, 0);
    const knownCosts = direct !== undefined && salaries !== undefined && overheads !== undefined;
    const net = knownCosts ? sales * (1 - direct / 100) - fixed : undefined;
    const gm = direct !== undefined ? 1 - direct / 100 : undefined;
    const per100 = (x: number) => (x / sales) * 100;
    const split: DeepProfit['split'] = [];
    if (direct !== undefined) split.push({ label: 'Goods & materials', amount: direct, tone: 'cost' });
    if (salaries !== undefined) split.push({ label: 'Salaries', amount: per100(salaries), tone: 'cost' });
    if (overheads !== undefined) split.push({ label: 'Rent & running costs', amount: per100(overheads), tone: 'cost' });
    if (marketing) split.push({ label: 'Marketing', amount: per100(marketing), tone: 'cost' });
    if (emi) split.push({ label: 'Loan EMIs', amount: per100(emi), tone: 'cost' });
    if (net !== undefined) split.push({ label: net >= 0 ? 'Profit' : 'Loss', amount: Math.abs(per100(net)), tone: net >= 0 ? 'profit' : 'loss' });
    profit = {
      sales,
      directPct: direct,
      fixed,
      net,
      netPct: net !== undefined ? per100(net) : undefined,
      breakEven: gm && gm > 0 && knownCosts ? fixed / gm : undefined,
      healthyPct: industry && LOW_MARGIN.includes(industry) ? 8 : 15,
      split,
    };
  }

  // ── Customers ──
  let customers: DeepCustomers | null = null;
  const active = v('deep_active');
  const good = v('deep_good');
  const top10 = v('deep_top10');
  const lost = v('deep_lost');
  if ([active, good, top10, lost].some((x) => x !== undefined)) {
    const perCustomer = sales !== undefined && active ? sales / active : undefined;
    const churnPct = lost !== undefined && active !== undefined && active + lost > 0 ? (lost / (active + lost)) * 100 : undefined;
    const notes: string[] = [];
    if (good !== undefined) {
      notes.push(
        good >= 7
          ? `${good} in 10 of your customers are good ones — a strong base to grow from.`
          : `Only ${good} in 10 customers are good ones. The others cost time in chasing, haggling and one-off sales.`,
      );
    }
    if (top10 !== undefined && top10 >= 50) notes.push(`Your top 10 customers bring ${pct(top10)} of sales — losing even one would hurt.`);
    if (churnPct !== undefined && churnPct >= 10) notes.push(`About ${pct(churnPct)} of regular customers left in the last year.`);
    customers = { active, good, perCustomer, top10, churnPct, notes };
  }

  // ── Cash ──
  let cash: DeepCash | null = null;
  const receivable = v('deep_receivable');
  const payable = v('deep_payable');
  const cashNow = v('deep_cash');
  if ([receivable, payable, cashNow].some((x) => x !== undefined)) {
    const receivableDays = receivable !== undefined && sales ? receivable / (sales / 30) : undefined;
    const monthlyOut = sales !== undefined && direct !== undefined ? (sales * direct) / 100 + (profit?.fixed ?? 0) : profit?.fixed || undefined;
    const runwayMonths = cashNow !== undefined && monthlyOut ? cashNow / monthlyOut : undefined;
    const notes: string[] = [];
    if (receivableDays !== undefined) {
      notes.push(
        receivableDays > 30
          ? `Customers hold about ${Math.round(receivableDays)} days of your sales — ${rupees(receivable!)} of your money sits with them.`
          : `Customers pay quickly — about ${Math.round(receivableDays)} days of sales outstanding.`,
      );
    }
    if (runwayMonths !== undefined) {
      notes.push(
        runwayMonths < 1
          ? 'Cash covers less than a month of costs — one slow month would hurt.'
          : `Cash covers about ${Math.round(runwayMonths * 10) / 10} months of costs.`,
      );
    }
    if (receivable !== undefined && payable !== undefined && receivable > payable * 2) {
      notes.push(`You are owed ${rupees(receivable)} but owe only ${rupees(payable)} — your customers are borrowing from you.`);
    }
    cash = { receivable, receivableDays, payable, cash: cashNow, runwayMonths, notes };
  }

  // ── Growth ideas worth money ──
  const levers: GrowthLever[] = [];
  const saleValue = avgSale ?? (sales && enquiries && convert ? sales / Math.max(1, (enquiries * convert) / 10) : undefined);
  if (enquiries && convert !== undefined && convert < 10 && saleValue) {
    levers.push({
      id: 'convert',
      title: 'Win one more in every 10 enquiries',
      amount: (enquiries / 10) * saleValue,
      per: 'month',
      note: `${Math.round(enquiries / 10)} more sales a month from the enquiries you already get — mostly by replying fast and following up.`,
      firstStep: 'Reply to every enquiry within an hour, and follow up twice: the next day, and again 3–4 days later.',
      service: 'ai',
    });
  }
  if (sales) {
    const priceOld = picked(answers, 'deep_price').some((p) => p === 'old' || p === 'never');
    levers.push({
      id: 'price',
      title: 'Raise prices by 5%',
      amount: sales * 0.05,
      per: 'month',
      note: priceOld
        ? 'You haven’t raised prices in over a year, while your costs have gone up. Almost all of this is extra profit.'
        : 'Almost all of this is extra profit — start with the products or customers where you are cheapest.',
      firstStep: 'Pick your 10 best-selling items and raise them by 5% from the 1st of next month.',
      service: 'erp',
    });
    if (direct !== undefined && direct > 2) {
      levers.push({
        id: 'costs',
        title: 'Cut what you buy by 2 in every ₹100',
        amount: sales * 0.02,
        per: 'month',
        note: 'Through better purchase prices, less waste and less dead stock — straight to profit.',
        firstStep: 'Get two fresh quotes for your five biggest purchase items before the next order.',
        service: 'erp',
      });
    }
    const repeat = s1('sales_repeat');
    if (repeat !== undefined && repeat < 60) {
      levers.push({
        id: 'repeat',
        title: 'Bring back more past customers',
        amount: sales * 0.1,
        per: 'month',
        note: `Repeat customers bring ${pct(repeat)} of sales today. Planned reminders and offers can add about 10% more.`,
        firstStep: 'Message every customer who hasn’t bought in 60 days with a personal reason to come back.',
        service: 'marketing',
      });
    }
  }
  if (customers?.perCustomer && lost) {
    levers.push({
      id: 'keep',
      title: 'Keep the regulars who leave',
      amount: (lost / 2) * customers.perCustomer,
      per: 'month',
      note: `You lost about ${lost} regular customers last year. Keeping half of them is worth this much in sales every month.`,
      firstStep: 'Call five regulars who stopped buying and ask what changed — then fix the most common reason.',
      service: 'marketing',
    });
  }
  if (receivable && cash?.receivableDays && cash.receivableDays > 30 && sales) {
    levers.push({
      id: 'collect',
      title: `Get paid in 30 days instead of ${Math.round(cash.receivableDays)}`,
      amount: receivable - sales,
      per: 'once',
      note: 'Cash that comes back into the business once — without selling a rupee more.',
      firstStep: 'Send a statement to every customer over 30 days, and call the ten biggest this week.',
      service: 'erp',
    });
  }
  levers.sort((a, b) => (a.per === b.per ? b.amount - a.amount : a.per === 'month' ? -1 : 1));

  // ── For the team ──
  const growth = v('deep_growth');
  const points: string[] = [];
  if (stage) points.push(`Stage: ${stage.label}${stage.holdingBack ? ` — held back by ${stage.holdingBack.label.toLowerCase()}` : ''}`);
  if (profit) {
    points.push(
      `Sales ${rupees(profit.sales)}/month${growth !== undefined ? ` (${growth >= 0 ? '+' : ''}${growth}% vs last year)` : ''}` +
        (profit.net !== undefined ? `, net profit ${rupees(profit.net)}/month (${pct(profit.netPct!)})` : '') +
        (profit.breakEven ? `, break-even ${rupees(profit.breakEven)}` : ''),
    );
  }
  if (customers) {
    const bits = [
      customers.active !== undefined && `${customers.active} active customers`,
      customers.good !== undefined && `${customers.good}/10 good`,
      customers.top10 !== undefined && `top 10 = ${pct(customers.top10)} of sales`,
    ].filter(Boolean);
    if (bits.length) points.push(`Customers: ${bits.join(', ')}`);
  }
  if (cash?.receivable !== undefined) {
    points.push(`Owed to them: ${rupees(cash.receivable)}${cash.receivableDays ? ` (${Math.round(cash.receivableDays)} days of sales)` : ''}`);
  }
  if (levers[0]) points.push(`Biggest idea: ${levers[0].title} — ${rupees(levers[0].amount)}${levers[0].per === 'month' ? '/month' : ' once'}`);

  const fields = DEEP_SECTIONS.flatMap((s) => visibleFields(s, ctx));
  const answered = fields.filter((f) => {
    const a = answers[f.id];
    return a && !a.skipped && (typeof a.value === 'number' || a.selected.length > 0);
  }).length;

  return { stage, profit, levers: levers.slice(0, 6), customers, cash, growth, points, answered, asked: fields.length };
}

// ── Stage 1 figures that travel with Stage 2 ────────────────

/** The Stage 1 answers Stage 2 builds on. Saved with Stage 2 as "s1.<id>", so its report link is complete on its own. */
const FROM_STAGE1 = ['sales_enquiries', 'sales_convert', 'sales_repeat', 'mkt_spend'];

/** Stage 2 answers plus the Stage 1 figures it uses, for saving. */
export function withStage1(answers: FormAnswers, stage1: FormAnswers): FormAnswers {
  const out: FormAnswers = { ...answers };
  for (const id of FROM_STAGE1) if (stage1[id] && typeof stage1[id].value === 'number') out[`s1.${id}`] = stage1[id];
  return out;
}

/** The Stage 1 figures saved with a Stage 2 report (see withStage1). */
export function stage1From(answers: FormAnswers): FormAnswers {
  const out: FormAnswers = {};
  for (const id of FROM_STAGE1) if (answers[`s1.${id}`]) out[id] = answers[`s1.${id}`];
  return out;
}
