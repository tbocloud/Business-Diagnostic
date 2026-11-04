import { type FormAnswers, type FormSection, num, picked, visibleFields } from './forms';

// ─────────────────────────────────────────────────────────────
// THE ERP CHECK — a short check on its own (from the start page) or after Stage 1/2:
// what the business uses today, what slows it down, its size, what the system should
// cover and how ready it is. Its report: how much an ERP would help, how ready they are,
// which modules to start with, a rough scope — and what to prepare.
// ─────────────────────────────────────────────────────────────

const NOT_SURE = [{ id: 'unsure', label: 'Not sure' }];

export const ERP_MODULES: { id: string; label: string; phase: 1 | 2 }[] = [
  { id: 'accounts', label: 'Accounts & GST', phase: 1 },
  { id: 'sales', label: 'Sales & invoicing', phase: 1 },
  { id: 'purchase', label: 'Purchase & suppliers', phase: 1 },
  { id: 'stock', label: 'Stock & warehouses', phase: 1 },
  { id: 'manufacturing', label: 'Manufacturing (BOM, production)', phase: 2 },
  { id: 'projects', label: 'Projects & jobs', phase: 2 },
  { id: 'crm', label: 'CRM — leads & follow-ups', phase: 2 },
  { id: 'hr', label: 'HR & payroll', phase: 2 },
  { id: 'pos', label: 'POS — retail counter', phase: 2 },
  { id: 'ecommerce', label: 'Online store link', phase: 2 },
  { id: 'service', label: 'Service & AMC contracts', phase: 2 },
  { id: 'mobile', label: 'Mobile app for field staff', phase: 2 },
];

export const ERP_PAINS: { id: string; label: string; fix: string; module?: string }[] = [
  { id: 'retype', label: 'The same data is typed in two or three places', fix: 'One entry flows everywhere — order, invoice, stock and accounts update together.' },
  { id: 'stock', label: 'Stock in the books never matches the shelf', fix: 'Every sale, purchase and transfer moves stock as it happens, with batch and location.', module: 'stock' },
  { id: 'gst', label: 'GST returns take days', fix: 'GSTR-1 and 3B come straight from your invoices, with e-invoice and e-way bill built in.', module: 'accounts' },
  { id: 'late', label: 'Month-end figures come late', fix: 'Profit, sales and cash reports are live — no waiting for the accountant.', module: 'accounts' },
  { id: 'branches', label: 'Can’t see all branches or godowns in one place', fix: 'All branches and warehouses in one system, compared side by side.', module: 'stock' },
  { id: 'mobile', label: 'No access when away from the office', fix: 'Works on the phone — approve, check stock and see sales from anywhere.', module: 'mobile' },
  { id: 'collect', label: 'Chasing payments by hand', fix: 'Who owes what, how overdue — with automatic reminders.', module: 'sales' },
  { id: 'approvals', label: 'Approvals happen on WhatsApp or paper', fix: 'Purchase and discount approvals inside the system, with a record of who approved.', module: 'purchase' },
];

export const ERP_SECTIONS: FormSection[] = [
  {
    id: 'today',
    title: 'What you use today',
    icon: 'Laptop',
    intro: 'The software and sheets the business runs on now, and what slows you down.',
    fields: [
      {
        id: 'erp_accounts',
        kind: 'single',
        text: 'What do you use for accounts and GST?',
        options: [
          { id: 'tally', label: 'Tally' },
          { id: 'zoho', label: 'Zoho Books' },
          { id: 'quickbooks', label: 'QuickBooks' },
          { id: 'busy', label: 'Busy or Marg' },
          { id: 'excel', label: 'Excel or paper' },
          { id: 'outside', label: 'Our accountant does it outside' },
          { id: 'erp', label: 'Another ERP' },
        ],
      },
      {
        id: 'erp_tools',
        kind: 'multi',
        text: 'Which of these do you also use?',
        options: [
          { id: 'billing', label: 'A separate billing or POS software' },
          { id: 'stocksheets', label: 'Excel sheets for stock' },
          { id: 'orders', label: 'WhatsApp or Excel for orders' },
          { id: 'crm', label: 'A CRM for leads' },
          { id: 'payroll', label: 'Payroll software' },
          { id: 'store', label: 'An online store (Shopify, WooCommerce, Amazon…)' },
          { id: 'none', label: 'None of these', exclusive: true },
        ],
      },
      { id: 'erp_pains', kind: 'multi', maxPicks: 4, text: 'What slows you down today?', options: ERP_PAINS.map((p) => ({ id: p.id, label: p.label })) },
    ],
  },
  {
    id: 'size',
    title: 'Your size',
    icon: 'Building2',
    intro: 'A few counts that decide how big the setup needs to be.',
    fields: [
      { id: 'erp_users', kind: 'number', text: 'How many people would use the system?', hint: 'Anyone who would log in — billing, stores, accounts, managers.', number: { min: 1, max: 10000, unit: 'users', placeholder: 'e.g. 6' }, options: NOT_SURE },
      { id: 'erp_sites', kind: 'number', text: 'How many branches, shops, warehouses or factories?', number: { min: 1, max: 1000, unit: 'sites', placeholder: 'e.g. 2' }, options: NOT_SURE },
      { id: 'erp_invoices', kind: 'number', text: 'How many sales invoices or bills in a month?', number: { min: 0, max: 1e7, unit: 'a month', placeholder: 'e.g. 400' }, options: NOT_SURE },
      { id: 'erp_items', kind: 'number', text: 'How many products, items or services do you sell?', number: { min: 0, max: 1e7, unit: 'items', placeholder: 'e.g. 800' }, options: NOT_SURE },
      { id: 'erp_staff', kind: 'number', text: 'How many employees are on your payroll?', number: { min: 0, max: 100000, unit: 'employees', placeholder: 'e.g. 20' }, options: NOT_SURE },
    ],
  },
  {
    id: 'needs',
    title: 'What it should cover',
    icon: 'Boxes',
    intro: 'The parts of the business the new system should run. Pick what matters now — the rest can come later.',
    fields: [
      { id: 'erp_modules', kind: 'multi', text: 'Which areas should the system cover?', options: ERP_MODULES.map((m) => ({ id: m.id, label: m.label })) },
      {
        id: 'erp_einvoice',
        kind: 'single',
        text: 'Do you need GST e-invoicing and e-way bills?',
        options: [
          { id: 'both', label: 'Yes — both' },
          { id: 'einvoice', label: 'E-invoice only' },
          { id: 'ewaybill', label: 'E-way bill only' },
          { id: 'no', label: 'No' },
          ...NOT_SURE,
        ],
      },
    ],
  },
  {
    id: 'ready',
    title: 'Getting ready',
    icon: 'ListChecks',
    intro: 'An ERP works when someone owns it and the data is ready. These tell us how quickly you could start.',
    fields: [
      {
        id: 'erp_owner',
        kind: 'single',
        text: 'Who would lead the switch on your side?',
        options: [
          { id: 'owner', label: 'I would lead it myself' },
          { id: 'manager', label: 'A manager with time for it' },
          { id: 'accountant', label: 'Our accountant' },
          { id: 'none', label: 'No one yet' },
        ],
      },
      {
        id: 'erp_data',
        kind: 'single',
        text: 'How tidy are your customer, item and opening-balance lists today?',
        options: [
          { id: 'clean', label: 'Clean and in one place' },
          { id: 'okay', label: 'Mostly okay' },
          { id: 'scattered', label: 'Scattered across sheets' },
          { id: 'paper', label: 'Mostly on paper' },
        ],
      },
      {
        id: 'erp_when',
        kind: 'single',
        text: 'When would you like to start?',
        options: [
          { id: 'now', label: 'This month' },
          { id: 'soon', label: 'In 1–3 months' },
          { id: 'later', label: 'In 3–6 months' },
          { id: 'exploring', label: 'Just exploring' },
        ],
      },
      {
        id: 'erp_budget',
        kind: 'single',
        text: 'A rough budget for the first year?',
        hint: 'Optional — it helps us suggest the right size of setup.',
        options: [
          { id: 'lt1', label: 'Under ₹1 lakh' },
          { id: '1to3', label: '₹1–3 lakh' },
          { id: '3to10', label: '₹3–10 lakh' },
          { id: 'gt10', label: 'Over ₹10 lakh' },
          { id: 'open', label: 'Not decided' },
        ],
      },
    ],
  },
];

// ── Results ─────────────────────────────────────────────────

export interface ErpResults {
  /** How much an ERP would help (0–100). */
  need: number | null;
  /** How ready they are to start (0–100). */
  readiness: number | null;
  verdict: { title: string; body: string; tone: 'good' | 'warn' | 'neutral' } | null;
  /** Their slowdowns, each with what an ERP changes. */
  fixes: { label: string; fix: string }[];
  phase1: string[];
  phase2: string[];
  einvoice?: string;
  size: { users?: number; sites?: number; invoices?: number; items?: number; staff?: number; label?: string; weeks?: string };
  today: string[];
  prepare: string[];
  points: string[];
  answered: number;
  asked: number;
}

const OPTION_LABEL = (field: string, id: string) =>
  ERP_SECTIONS.flatMap((s) => s.fields).find((f) => f.id === field)?.options?.find((o) => o.id === id)?.label ?? id;

export function computeErp(answers: FormAnswers): ErpResults {
  const v = (id: string) => num(answers, id);
  const one = (id: string) => picked(answers, id)[0] as string | undefined;
  const pains = picked(answers, 'erp_pains');
  const tools = picked(answers, 'erp_tools').filter((t) => t !== 'none');
  const accounts = one('erp_accounts');
  const users = v('erp_users');
  const sites = v('erp_sites');
  const invoices = v('erp_invoices');
  const items = v('erp_items');
  const staff = v('erp_staff');

  // ── How much it would help ──
  const needSignals = [accounts, pains.length, tools.length, users, sites, invoices].filter((x) => x !== undefined).length;
  let need: number | null = null;
  if (needSignals >= 2) {
    let n = pains.length * 12 + Math.min(4, tools.length) * 5;
    n += accounts === 'excel' || accounts === 'outside' ? 15 : accounts === 'tally' || accounts === 'busy' ? 8 : accounts === 'erp' ? 0 : 5;
    if (users !== undefined) n += users >= 10 ? 12 : users >= 4 ? 8 : 2;
    if (sites !== undefined && sites >= 2) n += sites >= 4 ? 12 : 8;
    if (invoices !== undefined) n += invoices >= 500 ? 10 : invoices >= 100 ? 6 : 1;
    need = Math.min(100, n);
  }

  // ── How ready they are ──
  const owner = one('erp_owner');
  const data = one('erp_data');
  const when = one('erp_when');
  const budget = one('erp_budget');
  let readiness: number | null = null;
  if ([owner, data, when].filter(Boolean).length >= 2) {
    readiness =
      ({ owner: 35, manager: 30, accountant: 15, none: 0 } as Record<string, number>)[owner ?? ''] ??
      0;
    readiness += ({ clean: 30, okay: 22, scattered: 10, paper: 0 } as Record<string, number>)[data ?? ''] ?? 0;
    readiness += ({ now: 25, soon: 20, later: 10, exploring: 3 } as Record<string, number>)[when ?? ''] ?? 0;
    if (budget && budget !== 'open') readiness += 10;
    readiness = Math.min(100, readiness);
  }

  let verdict: ErpResults['verdict'] = null;
  if (need !== null) {
    if (need < 35) {
      verdict = { title: 'Not urgent yet', body: 'Your current tools are coping. A simple accounting and billing setup may be enough for now — come back when the business grows or adds a branch.', tone: 'neutral' };
    } else if (readiness === null || readiness >= 55) {
      verdict = { title: 'A good time to start', body: 'An ERP would take real work off your plate, and you are ready to begin. A short demo on your own data is the next step.', tone: 'good' };
    } else {
      verdict = { title: 'Worth it — get ready first', body: 'An ERP would help a lot, but a few things need sorting before you start, so the switch goes smoothly. See “Before you start” below.', tone: 'warn' };
    }
  }

  // ── Modules ──
  const chosen = new Set(picked(answers, 'erp_modules'));
  for (const p of pains) {
    const m = ERP_PAINS.find((x) => x.id === p)?.module;
    if (m) chosen.add(m);
  }
  if (chosen.size || accounts) chosen.add('accounts');
  const phase1 = ERP_MODULES.filter((m) => m.phase === 1 && chosen.has(m.id)).map((m) => m.label);
  const phase2 = ERP_MODULES.filter((m) => m.phase === 2 && chosen.has(m.id)).map((m) => m.label);
  const einvoice = ({ both: 'E-invoice and e-way bill', einvoice: 'E-invoice', ewaybill: 'E-way bill' } as Record<string, string>)[one('erp_einvoice') ?? ''];

  // ── Scope ──
  let label: string | undefined;
  let weeks: string | undefined;
  if (users !== undefined || sites !== undefined) {
    const big = (users ?? 0) > 25 || (sites ?? 1) > 5;
    const mid = (users ?? 0) > 5 || (sites ?? 1) > 1 || (invoices ?? 0) > 1000;
    label = big ? 'A larger, multi-site setup' : mid ? 'A mid-size setup' : 'A small, quick setup';
    weeks = big ? 'about 3–4 months' : mid ? 'about 6–10 weeks' : 'about 3–5 weeks';
  }

  const today = [accounts && OPTION_LABEL('erp_accounts', accounts), ...tools.map((t) => OPTION_LABEL('erp_tools', t))].filter((x): x is string => !!x);

  const prepare: string[] = [];
  if (owner === 'none' || owner === 'accountant') prepare.push('Name one person who owns the project and has a few hours a week for it.');
  if (data === 'scattered' || data === 'paper') prepare.push('Put your customer, supplier and item lists into one clean sheet each — this is most of the setup work.');
  prepare.push('Agree a start date at the beginning of a month or quarter, so opening balances are clean.');
  if ((users ?? 0) > 5) prepare.push('List who needs to do what in the system, so access and training are planned from day one.');

  const fixes = pains.map((p) => ERP_PAINS.find((x) => x.id === p)).filter((x): x is (typeof ERP_PAINS)[number] => !!x).map(({ label, fix }) => ({ label, fix }));

  // ── For the team ──
  const points: string[] = [];
  if (today.length || pains.length) {
    points.push(
      [today.length && `Today: ${today.join(' + ')}`, pains.length && `slowed by: ${pains.map((p) => ERP_PAINS.find((x) => x.id === p)?.label).join('; ')}`]
        .filter(Boolean)
        .join(' — '),
    );
  }
  const sizeBits = [
    users !== undefined && `${users} users`,
    sites !== undefined && `${sites} site${sites === 1 ? '' : 's'}`,
    invoices !== undefined && `${invoices.toLocaleString('en-IN')} invoices/month`,
    items !== undefined && `${items.toLocaleString('en-IN')} items`,
    staff !== undefined && `${staff} on payroll`,
  ].filter(Boolean);
  if (sizeBits.length) points.push(`Size: ${sizeBits.join(', ')}${label ? ` (${label.toLowerCase()})` : ''}`);
  if (phase1.length || phase2.length) {
    points.push(`Needs: ${[...phase1, ...phase2].join(', ')}${einvoice ? `; GST ${einvoice.toLowerCase()}` : ''}`);
  }
  if (need !== null) points.push(`Need ${need}/100${readiness !== null ? `, readiness ${readiness}/100` : ''} — ${verdict?.title.toLowerCase()}`);
  const plan = [
    when && `start: ${OPTION_LABEL('erp_when', when).toLowerCase()}`,
    budget && `budget: ${OPTION_LABEL('erp_budget', budget)}`,
    owner && `led by: ${({ owner: 'the owner', manager: 'a manager', accountant: 'the accountant', none: 'no one yet' } as Record<string, string>)[owner]}`,
  ].filter(Boolean);
  if (plan.length) points.push(plan.join('; ').replace(/^./, (c) => c.toUpperCase()));

  const fields = ERP_SECTIONS.flatMap((s) => visibleFields(s, { answers, stage1: {} }));
  const answered = fields.filter((f) => {
    const a = answers[f.id];
    return a && !a.skipped && (typeof a.value === 'number' || a.selected.length > 0);
  }).length;

  return { need, readiness, verdict, fixes, phase1, phase2, einvoice, size: { users, sites, invoices, items, staff, label, weeks }, today, prepare, points, answered, asked: fields.length };
}
