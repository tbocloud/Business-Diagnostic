import { type FormAnswers, type FormCtx, type FormField, type FormSection, num, picked, visibleFields, visibleSections } from './forms';
import { INDUSTRIES } from './profile';
import type { IndustryId, Profile } from './types';

// ─────────────────────────────────────────────────────────────
// THE ERP CHECK — like the Stage 1 areas, but only about how the business runs on its
// systems: accounts & GST, sales & billing, stock, purchase, production & projects,
// people & payroll, control & reports. Every question uncovers a real gap the current
// setup leaves open, and the report shows what ERPNext closes, area by area.
// ─────────────────────────────────────────────────────────────

const industryOf = (c: FormCtx): IndustryId | undefined =>
  c.profile?.industry ?? (c.answers.erp_industry?.selected[0] as IndustryId | undefined);
const inIndustry = (...ids: IndustryId[]) => (c: FormCtx) => {
  const i = industryOf(c);
  return !i || ids.includes(i);
};
const notIndustry = (...ids: IndustryId[]) => (c: FormCtx) => {
  const i = industryOf(c);
  return !i || !ids.includes(i);
};

/** Module ids → names shown in the plan. */
export const MODULES: Record<string, string> = {
  accounts: 'Accounts & GST',
  sales: 'Selling & billing',
  stock: 'Stock & warehouses',
  purchase: 'Buying & suppliers',
  manufacturing: 'Manufacturing',
  projects: 'Projects & job costing',
  hr: 'HR & payroll',
  dashboards: 'Live dashboards & reports',
  control: 'Roles, approvals & audit trail',
  multi: 'Multi-branch & multi-company',
};
const CORE = ['accounts', 'sales', 'stock', 'purchase'];

const q = (f: Omit<FormField, 'kind'>): FormField => ({ ...f, kind: 'single' });

export const ERP_SECTIONS: FormSection[] = [
  {
    id: 'setup',
    title: 'Your setup today',
    short: 'Setup',
    icon: 'Laptop',
    intro: 'What the business runs on now — so the rest of the check, and your ERP plan, fit you.',
    fields: [
      {
        id: 'erp_industry',
        kind: 'single',
        text: 'What kind of business is it?',
        show: (c) => !c.profile?.industry,
        options: INDUSTRIES.map((i) => ({ id: i.id, label: i.label })),
      },
      {
        id: 'erp_current',
        kind: 'single',
        text: 'What do you use for accounts and billing today?',
        allowOther: true,
        options: [
          { id: 'tally', label: 'Tally' },
          { id: 'busy', label: 'Busy or Marg' },
          { id: 'zoho', label: 'Zoho Books' },
          { id: 'quickbooks', label: 'QuickBooks' },
          { id: 'excel', label: 'Excel, notebooks or paper' },
          { id: 'outside', label: 'Our CA or accountant does it outside' },
          { id: 'erp', label: 'Another ERP (SAP B1, Odoo, a custom one…)' },
        ],
      },
      { id: 'erp_users', kind: 'number', text: 'How many people would use the system?', hint: 'Billing, stores, accounts, sales, managers — anyone who would log in.', number: { min: 1, max: 10000, unit: 'people', placeholder: 'e.g. 6' }, options: [{ id: 'unsure', label: 'Not sure' }] },
      { id: 'erp_sites', kind: 'number', text: 'How many branches, shops, godowns or factories?', number: { min: 1, max: 1000, unit: 'locations', placeholder: 'e.g. 2' }, options: [{ id: 'unsure', label: 'Not sure' }] },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts & GST',
    short: 'Accounts',
    icon: 'Wallet',
    intro: 'Whether your books keep up with the business on their own — or need people to keep typing, matching and chasing.',
    fields: [
      q({
        id: 'erp_acc_entry',
        text: 'How do your sales and purchase bills get into your accounts?',
        options: [
          { id: 'auto', label: 'Automatically — billing and accounts are one system', score: 100 },
          { id: 'import', label: 'Exported from billing and imported into accounts', score: 55 },
          { id: 'retype', label: 'Our accountant types them in again from copies', score: 20 },
          { id: 'late', label: 'Entered weeks later, in a batch', score: 5 },
        ],
        insight: {
          gap: 'Every bill is typed twice — once to sell, once to account',
          strength: 'Bills flow into the accounts by themselves',
          why: 'Typing the same bill twice costs hours every week, and every re-typed bill is a chance for a wrong amount or a missed entry.',
          fix: 'In ERPNext the invoice is the accounting entry: sales, GST and the ledgers update the moment you bill.',
          module: 'accounts',
          hours: { import: 4, retype: 12, late: 16 },
        },
      }),
      q({
        id: 'erp_acc_gst',
        text: 'How long does it take to prepare your GST returns each month?',
        options: [
          { id: 'minutes', label: 'Minutes — the returns come straight from the system', score: 100 },
          { id: 'halfday', label: 'About half a day of checking', score: 60 },
          { id: 'days', label: '2–3 days of matching bills by hand', score: 15 },
          { id: 'ca', label: 'Our CA does it — we don’t really know', score: 35 },
        ],
        insight: {
          gap: 'GST returns take days of matching by hand',
          strength: 'GST returns are quick and accurate',
          why: 'Days spent matching bills every month — and mistakes there mean notices, interest and lost input credit.',
          fix: 'GSTR-1 and GSTR-3B come straight from your invoices, with e-invoice (IRN) and e-way bills made from the same bill.',
          module: 'accounts',
          hours: { halfday: 4, days: 20, ca: 6 },
        },
      }),
      q({
        id: 'erp_acc_bank',
        text: 'How do you match your bank statement with your books?',
        options: [
          { id: 'system', label: 'The statement is imported and matched in the system', score: 100 },
          { id: 'monthly', label: 'By hand, every month', score: 50 },
          { id: 'yearly', label: 'Only at year-end, for the audit', score: 15 },
          { id: 'never', label: 'We don’t really match it', score: 0 },
        ],
        insight: {
          gap: 'The bank and the books are matched by hand — or not at all',
          strength: 'Bank and books agree, every month',
          why: 'Without matching, missed payments, double entries and bank charges stay hidden until the audit.',
          fix: 'Bank statements import and match against invoices and payments automatically; only the odd ones need a look.',
          module: 'accounts',
          hours: { monthly: 6, yearly: 2 },
        },
      }),
      q({
        id: 'erp_acc_profit',
        text: 'When can you see last month’s profit?',
        options: [
          { id: 'live', label: 'Any day — the reports are live', score: 100 },
          { id: 'week', label: 'In the first week of the month', score: 65 },
          { id: 'weeks', label: 'Weeks later, once the accountant closes the books', score: 20 },
          { id: 'year', label: 'Only at year-end', score: 5 },
        ],
        insight: {
          gap: 'You see your profit weeks late — or once a year',
          strength: 'Profit is visible whenever you need it',
          why: 'Decisions about prices, staff and stock are made on guesswork when the real numbers arrive weeks later.',
          fix: 'Profit & loss, balance sheet and cash flow are live — by branch, product or customer — without waiting for month-end.',
          module: 'dashboards',
        },
      }),
      q({
        id: 'erp_acc_due',
        text: 'How do you know which customers owe you money today?',
        options: [
          { id: 'live', label: 'A live list with how overdue each one is', score: 100 },
          { id: 'ask', label: 'We ask the accountant', score: 40 },
          { id: 'memory', label: 'From memory, a notebook or WhatsApp', score: 10 },
          { id: 'late', label: 'When we notice they haven’t paid', score: 0 },
        ],
        insight: {
          gap: 'Nobody sees who owes you money until it’s late',
          strength: 'You always know who owes you, and how much',
          why: 'Money owed to you that nobody is watching gets paid late — or not at all — and your cash runs short.',
          fix: 'Live receivables with ageing, credit limits and automatic payment reminders on email and WhatsApp.',
          module: 'accounts',
          hours: { ask: 3, memory: 6, late: 6 },
        },
      }),
    ],
  },
  {
    id: 'sales',
    title: 'Sales & billing',
    short: 'Sales',
    icon: 'ShoppingBag',
    intro: 'How a sale moves from the first quote to the money in the bank — and how much of it depends on people remembering.',
    fields: [
      q({
        id: 'erp_sal_flow',
        text: 'How does a sale move from quote to invoice?',
        options: [
          { id: 'system', label: 'Quote → order → delivery → invoice, all in one system', score: 100 },
          { id: 'split', label: 'Quotes in Word or Excel, invoices in billing software', score: 45 },
          { id: 'whatsapp', label: 'Orders on WhatsApp or phone, a bill at the end', score: 20 },
          { id: 'varies', label: 'Every salesperson does it their own way', score: 10 },
        ],
        insight: {
          gap: 'Quotes, orders and bills live in different places',
          strength: 'One clean flow from quote to invoice',
          why: 'When quotes, orders and bills don’t connect, orders get missed, delivered wrong or billed late.',
          fix: 'One flow: quotation → sales order → delivery note → invoice, each made from the last in one click, nothing typed twice.',
          module: 'sales',
          hours: { split: 6, whatsapp: 10, varies: 10 },
        },
      }),
      q({
        id: 'erp_sal_price',
        text: 'How are prices and discounts controlled?',
        options: [
          { id: 'system', label: 'Price lists and discount limits in the system', score: 100 },
          { id: 'sheet', label: 'A price sheet everyone is meant to follow', score: 55 },
          { id: 'sales', label: 'Salespeople decide case by case', score: 20 },
          { id: 'varies', label: 'It varies a lot — nobody really checks', score: 5 },
        ],
        insight: {
          gap: 'Prices and discounts depend on who is selling',
          strength: 'Prices and discounts are under control',
          why: 'Uncontrolled discounts quietly eat your margin — often more than any single cost.',
          fix: 'Price lists by customer group or region, discount limits per user, and an approval step above them.',
          module: 'sales',
        },
      }),
      q({
        id: 'erp_sal_credit',
        text: 'Do you stop selling on credit to customers who are over their limit or overdue?',
        options: [
          { id: 'system', label: 'Yes — the system warns or blocks the order', score: 100 },
          { id: 'manual', label: 'Someone checks by hand', score: 45 },
          { id: 'notice', label: 'Only when we happen to notice', score: 15 },
          { id: 'no', label: 'No — we keep selling', score: 0 },
        ],
        insight: {
          gap: 'You keep selling on credit to customers who already owe you',
          strength: 'Credit limits are respected',
          why: 'Selling more to a customer who is already late turns a small risk into a bad debt.',
          fix: 'Credit limits per customer: the order is warned or stopped when they are over the limit or overdue.',
          module: 'sales',
        },
      }),
      q({
        id: 'erp_sal_status',
        text: 'Can your team see where an order is — made, packed, sent, billed, paid — without asking around?',
        options: [
          { id: 'yes', label: 'Yes, on one screen', score: 100 },
          { id: 'partly', label: 'Partly', score: 50 },
          { id: 'calls', label: 'Only by calling people', score: 15 },
          { id: 'no', label: 'No', score: 0 },
        ],
        insight: {
          gap: 'Finding an order’s status takes phone calls',
          strength: 'Everyone can see where each order is',
          why: 'Every “where is my order?” costs a call, and a customer kept waiting for an answer.',
          fix: 'Every order’s status — delivered, billed, paid — on one screen, for anyone allowed to see it, on the phone too.',
          module: 'sales',
          hours: { partly: 3, calls: 8, no: 8 },
        },
      }),
    ],
  },
  {
    id: 'stock',
    title: 'Stock & warehouses',
    short: 'Stock',
    icon: 'Boxes',
    show: notIndustry('services', 'tech', 'education'),
    intro: 'Whether the stock in your books is the stock on your shelves — and whether you know what to buy, and what is stuck.',
    fields: [
      q({
        id: 'erp_stk_match',
        text: 'When you count your stock, how close is it to what the books say?',
        options: [
          { id: 'exact', label: 'Almost exact', score: 100 },
          { id: 'small', label: 'Small differences', score: 55 },
          { id: 'big', label: 'Big differences', score: 15 },
          { id: 'none', label: 'Stock isn’t really kept in the books', score: 0 },
        ],
        insight: {
          gap: 'Stock in the books doesn’t match the shelf',
          strength: 'Books and shelves agree',
          why: 'When the books are wrong, you run out of what sells, over-buy what doesn’t, and losses go unnoticed.',
          fix: 'Every sale, purchase, return and transfer moves stock as it happens — by batch, serial number and location.',
          module: 'stock',
          hours: { small: 4, big: 10, none: 8 },
        },
      }),
      q({
        id: 'erp_stk_reorder',
        text: 'How do you know when to reorder?',
        options: [
          { id: 'system', label: 'The system shows what’s below its reorder level', score: 100 },
          { id: 'check', label: 'Someone checks the shelves regularly', score: 45 },
          { id: 'out', label: 'When it runs out', score: 10 },
          { id: 'customer', label: 'When a customer asks for it', score: 0 },
        ],
        insight: {
          gap: 'You reorder when things run out',
          strength: 'Reordering happens before you run out',
          why: 'Running out loses sales and customers; panic-buying costs more and fills the godown with the wrong things.',
          fix: 'Reorder levels per item and location raise purchase requests automatically, before you run out.',
          module: 'stock',
        },
      }),
      q({
        id: 'erp_stk_dead',
        text: 'Do you know which stock hasn’t moved in 90 days?',
        options: [
          { id: 'yes', label: 'Yes — a report shows it', score: 100 },
          { id: 'rough', label: 'Roughly', score: 45 },
          { id: 'no', label: 'No idea', score: 5 },
        ],
        insight: {
          gap: 'Slow and dead stock is invisible',
          strength: 'You know what stock is stuck',
          why: 'Stock that doesn’t move is your cash sitting on a shelf — and it loses value every month.',
          fix: 'Stock ageing and slow-moving reports show what to clear, and what not to buy again.',
          module: 'stock',
        },
      }),
      q({
        id: 'erp_stk_sites',
        text: 'Can you see the stock at each branch or godown, live?',
        options: [
          { id: 'yes', label: 'Yes, in one place', score: 100 },
          { id: 'call', label: 'Only by calling each one', score: 35 },
          { id: 'month', label: 'Only at month-end', score: 15 },
          { id: 'one', label: 'We have just one location' },
        ],
        insight: {
          gap: 'Each branch’s stock is a phone call away',
          strength: 'All locations’ stock in one view',
          why: 'One branch runs out while another is full of the same item — and transfers happen on WhatsApp, if at all.',
          fix: 'All branches and warehouses in one system: live stock everywhere, transfers recorded, nothing lost in between.',
          module: 'multi',
        },
      }),
      q({
        id: 'erp_stk_batch',
        text: 'Do you track batches, expiry dates or serial numbers where they matter?',
        show: notIndustry('construction'),
        options: [
          { id: 'system', label: 'Yes, in the system', score: 100 },
          { id: 'paper', label: 'On paper or in sheets', score: 40 },
          { id: 'no', label: 'Not really', score: 10 },
          { id: 'na', label: 'Not needed for our products' },
        ],
        insight: {
          gap: 'Batches, expiry and serial numbers aren’t tracked',
          strength: 'Batches and expiry are under control',
          why: 'Expired stock written off, the wrong batch sent, warranties you can’t check — each one costs money and trust.',
          fix: 'Batch, expiry and serial numbers tracked from purchase to sale, with first-expiry-first-out picking.',
          module: 'stock',
        },
      }),
    ],
  },
  {
    id: 'purchase',
    title: 'Purchase & suppliers',
    short: 'Purchase',
    icon: 'Truck',
    show: notIndustry('education'),
    intro: 'How buying is ordered, checked and paid — the place where money leaks without anyone noticing.',
    fields: [
      q({
        id: 'erp_pur_order',
        text: 'How are purchases ordered?',
        options: [
          { id: 'system', label: 'Purchase orders from the system, with approval', score: 100 },
          { id: 'sheet', label: 'Purchase orders in Excel or on WhatsApp', score: 45 },
          { id: 'phone', label: 'Phone calls — no written order', score: 15 },
          { id: 'anyone', label: 'Whoever needs something just buys it', score: 5 },
        ],
        insight: {
          gap: 'Buying happens without proper orders or approval',
          strength: 'Purchases are ordered and approved properly',
          why: 'Without orders and approvals, over-buying, wrong prices and the odd “arrangement” with a supplier go unnoticed.',
          fix: 'Purchase request → approved purchase order → goods receipt → supplier bill, linked end to end.',
          module: 'purchase',
        },
      }),
      q({
        id: 'erp_pur_match',
        text: 'Before paying a supplier, do you check the bill against the order and what was received?',
        options: [
          { id: 'system', label: 'Always — the system matches them', score: 100 },
          { id: 'manual', label: 'Sometimes, by hand', score: 40 },
          { id: 'rarely', label: 'Rarely', score: 15 },
          { id: 'never', label: 'Never', score: 0 },
        ],
        insight: {
          gap: 'Supplier bills are paid without checking them against what arrived',
          strength: 'Every supplier bill is checked before payment',
          why: 'Paying for goods that never came, short deliveries or higher prices than agreed is one of the most common silent leaks.',
          fix: 'Three-way match: a bill can only be paid when it agrees with the purchase order and the goods received.',
          module: 'purchase',
          hours: { manual: 4 },
        },
      }),
      q({
        id: 'erp_pur_rates',
        text: 'Can you see what each supplier charged you for the same item over time?',
        options: [
          { id: 'yes', label: 'Yes, with the history', score: 100 },
          { id: 'search', label: 'Only by digging through old bills', score: 35 },
          { id: 'no', label: 'No', score: 5 },
        ],
        insight: {
          gap: 'You can’t compare suppliers’ prices',
          strength: 'You know who gives you the best price',
          why: 'Without the history you can’t negotiate — and small price creeps add up across every order.',
          fix: 'Supplier quotations side by side, and the full price history for every item and supplier.',
          module: 'purchase',
        },
      }),
      q({
        id: 'erp_pur_due',
        text: 'Do you know which supplier payments fall due this week?',
        options: [
          { id: 'yes', label: 'Yes, from a live list', score: 100 },
          { id: 'ask', label: 'The accountant tells us', score: 45 },
          { id: 'call', label: 'When suppliers call', score: 10 },
        ],
        insight: {
          gap: 'Supplier payments are paid when suppliers chase',
          strength: 'Supplier payments are planned',
          why: 'Paying late hurts supplier trust and early-payment discounts; paying early hurts your cash.',
          fix: 'Payables by due date, so you pay on time, keep the discounts and plan your cash.',
          module: 'accounts',
        },
      }),
    ],
  },
  {
    id: 'production',
    title: 'Production & projects',
    short: 'Production',
    icon: 'Factory',
    show: inIndustry('manufacturing', 'construction', 'services', 'tech', 'other'),
    intro: 'What each product, job or project really costs you — and whether work is planned, or found out halfway.',
    fields: [
      q({
        id: 'erp_mfg_bom',
        text: 'Do you have a recipe (bill of materials) for each product, with its cost?',
        show: inIndustry('manufacturing', 'food', 'other'),
        options: [
          { id: 'system', label: 'Yes — in the system, with live costs', score: 100 },
          { id: 'sheet', label: 'On paper or in Excel', score: 45 },
          { id: 'heads', label: 'In experienced people’s heads', score: 15 },
          { id: 'no', label: 'No', score: 5 },
        ],
        insight: {
          gap: 'Product recipes and costs aren’t written down',
          strength: 'Every product has a recipe and a real cost',
          why: 'Without a costed recipe you can’t price with confidence, and raw-material use can’t be checked.',
          fix: 'Bills of materials with live costs; work orders use up raw material and add finished goods automatically.',
          module: 'manufacturing',
        },
      }),
      q({
        id: 'erp_mfg_plan',
        text: 'How do you plan production against orders?',
        show: inIndustry('manufacturing', 'other'),
        options: [
          { id: 'system', label: 'A production plan from orders and stock', score: 100 },
          { id: 'meeting', label: 'A weekly meeting and sheets', score: 50 },
          { id: 'daily', label: 'Day to day, as orders come', score: 20 },
          { id: 'short', label: 'We often find material short midway', score: 5 },
        ],
        insight: {
          gap: 'Production is planned day to day',
          strength: 'Production is planned from orders and stock',
          why: 'Material shortages halfway through a job mean idle workers, late orders and rush buying.',
          fix: 'Production planning from sales orders and stock: what to make, what to buy, and when.',
          module: 'manufacturing',
        },
      }),
      q({
        id: 'erp_prj_cost',
        text: 'Do you know the real cost and profit of each job or project?',
        options: [
          { id: 'yes', label: 'Yes — time and materials are booked to each one', score: 100 },
          { id: 'end', label: 'We estimate it at the end', score: 40 },
          { id: 'total', label: 'We only see the total profit', score: 15 },
          { id: 'no', label: 'No', score: 5 },
        ],
        insight: {
          gap: 'You don’t know which jobs make money',
          strength: 'Every job’s profit is known',
          why: 'Some jobs quietly lose money every time — and without costs per job, you keep quoting them the same way.',
          fix: 'Every hour, material and expense booked to the project or job — profit per job, live, against the budget.',
          module: 'projects',
        },
      }),
    ],
  },
  {
    id: 'people',
    title: 'People & payroll',
    short: 'Payroll',
    icon: 'Users',
    show: (c) => c.profile?.teamSize !== 'solo',
    intro: 'Attendance, salaries and leave — the monthly work that can run itself.',
    fields: [
      q({
        id: 'erp_hr_attend',
        text: 'How is attendance recorded?',
        options: [
          { id: 'linked', label: 'Biometric or app, linked to payroll', score: 100 },
          { id: 'bio', label: 'Biometric, but payroll is separate', score: 50 },
          { id: 'register', label: 'A register or Excel', score: 20 },
          { id: 'none', label: 'Not really recorded', score: 5 },
        ],
        insight: {
          gap: 'Attendance and payroll don’t talk to each other',
          strength: 'Attendance flows into payroll',
          why: 'Copying attendance into payroll by hand takes time and leads to salary mistakes and disputes.',
          fix: 'Attendance from biometric devices or mobile check-in flows straight into payroll, with leave applied.',
          module: 'hr',
          hours: { bio: 3, register: 6, none: 2 },
        },
      }),
      q({
        id: 'erp_hr_payroll',
        text: 'How long does monthly payroll take?',
        options: [
          { id: 'hour', label: 'About an hour — the system calculates it', score: 100 },
          { id: 'day', label: 'A day in Excel', score: 45 },
          { id: 'days', label: 'Several days, with corrections', score: 15 },
          { id: 'outside', label: 'It’s outsourced — we don’t see the details', score: 40 },
        ],
        insight: {
          gap: 'Payroll is a monthly spreadsheet job',
          strength: 'Payroll runs itself',
          why: 'Hand-made payroll takes days, and PF, ESI, PT or TDS mistakes turn into penalties.',
          fix: 'Salary slips with PF, ESI, PT and TDS calculated automatically and sent to each employee.',
          module: 'hr',
          hours: { day: 8, days: 20, outside: 2 },
        },
      }),
      q({
        id: 'erp_hr_leave',
        text: 'How do staff apply for leave and claim expenses?',
        options: [
          { id: 'app', label: 'In an app, with approval', score: 100 },
          { id: 'whatsapp', label: 'On WhatsApp or email', score: 40 },
          { id: 'paper', label: 'On paper', score: 15 },
          { id: 'none', label: 'There’s no real process', score: 5 },
        ],
        insight: {
          gap: 'Leave and expenses run on WhatsApp and paper',
          strength: 'Leave and expenses are approved properly',
          why: 'Lost requests, unapproved leave and expense claims nobody checked — each a small cost and a source of friction.',
          fix: 'Leave and expense claims on the phone, approved by managers, and carried into payroll automatically.',
          module: 'hr',
        },
      }),
    ],
  },
  {
    id: 'control',
    title: 'Control & reports',
    short: 'Control',
    icon: 'Gauge',
    intro: 'Whether you can see and control the business from anywhere — or it only runs when you are in the room.',
    fields: [
      q({
        id: 'erp_ctl_phone',
        text: 'Can you see today’s sales, cash and stock on your phone?',
        options: [
          { id: 'live', label: 'Yes — a live dashboard', score: 100 },
          { id: 'ask', label: 'I ask someone to send it', score: 40 },
          { id: 'month', label: 'Only at month-end', score: 15 },
          { id: 'no', label: 'No', score: 5 },
        ],
        insight: {
          gap: 'You can’t see the business without asking someone',
          strength: 'You see the business live, from anywhere',
          why: 'When the owner has to ask for the numbers, problems are found late — and the business can’t run without you nearby.',
          fix: 'A live dashboard of sales, cash, stock and money owed — on your phone, wherever you are.',
          module: 'dashboards',
        },
      }),
      q({
        id: 'erp_ctl_tools',
        text: 'How many separate tools and sheets does it take to run a normal day?',
        options: [
          { id: 'one', label: 'One system', score: 100 },
          { id: 'few', label: '2–3 tools', score: 55 },
          { id: 'many', label: '4–6 tools and sheets', score: 20 },
          { id: 'lots', label: 'Too many to count', score: 5 },
        ],
        insight: {
          gap: 'The business runs on too many separate tools',
          strength: 'One system, one version of the truth',
          why: 'Every extra tool means copying data between them, numbers that never agree, and knowledge locked in one person’s sheet.',
          fix: 'Accounts, sales, stock, purchase and people in one system — one version of the truth.',
          module: 'dashboards',
          hours: { few: 4, many: 10, lots: 14 },
        },
      }),
      q({
        id: 'erp_ctl_access',
        text: 'Can you control who sees and changes what — prices, costs, deleting bills?',
        options: [
          { id: 'yes', label: 'Yes — user permissions, and a record of every change', score: 100 },
          { id: 'partly', label: 'Partly', score: 45 },
          { id: 'all', label: 'Everyone can see and change everything', score: 10 },
          { id: 'shared', label: 'We all use one shared login', score: 0 },
        ],
        insight: {
          gap: 'Anyone can see or change anything — with no record',
          strength: 'Access is controlled and every change is recorded',
          why: 'Without permissions and an audit trail, a deleted bill or a changed price is impossible to trace — mistakes and fraud look the same.',
          fix: 'Role-based permissions, approval rules and a full audit trail of who changed what, and when.',
          module: 'control',
        },
      }),
      q({
        id: 'erp_ctl_grow',
        text: 'If you opened another branch next month, could your system handle it?',
        options: [
          { id: 'yes', label: 'Yes — we would just add it', score: 100 },
          { id: 'work', label: 'With a lot of extra work', score: 40 },
          { id: 'new', label: 'We would need new software', score: 10 },
          { id: 'unsure', label: 'Not sure', score: 30 },
        ],
        insight: {
          gap: 'Your system would hold you back from growing',
          strength: 'Your system is ready for the next branch',
          why: 'When growth means more sheets and more people to copy data between them, every new branch adds chaos, not profit.',
          fix: 'Branches, warehouses and even new companies added in minutes, with combined and separate reports.',
          module: 'multi',
        },
      }),
      q({
        id: 'erp_ctl_when',
        text: 'When would you like to fix these?',
        hint: 'Not scored — it helps us plan your demo.',
        options: [
          { id: 'now', label: 'As soon as possible' },
          { id: 'soon', label: 'In the next 1–3 months' },
          { id: 'later', label: 'In 3–6 months' },
          { id: 'exploring', label: 'Just exploring for now' },
        ],
      }),
    ],
  },
];

// ── Results ─────────────────────────────────────────────────

export const ERP_TARGET = 70;

export type ErpStatus = 'good' | 'push' | 'gap';

export interface ErpInsight {
  id: string;
  area: string;
  areaTitle: string;
  kind: 'gap' | 'watch' | 'strength';
  title: string;
  answer: string;
  why: string;
  fix: string;
  module: string;
  score: number;
  hours: number;
}

export interface ErpArea {
  id: string;
  title: string;
  short: string;
  icon: string;
  score: number | null;
  status: ErpStatus | null;
  gaps: ErpInsight[];
  strengths: ErpInsight[];
}

export interface ErpResults {
  overall: number | null;
  verdict: { title: string; body: string; tone: 'good' | 'warn' | 'gap' } | null;
  areas: ErpArea[];
  /** The gaps that cost most, worst first. */
  topGaps: ErpInsight[];
  gapCount: number;
  /** Rough hours a month the gaps take (work ERPNext does for you). */
  hours: number;
  phase1: string[];
  phase2: string[];
  current?: { label: string; note: string };
  size: { users?: number; sites?: number; label?: string; weeks?: string };
  when?: string;
  points: string[];
  answered: number;
  asked: number;
}

const CURRENT_NOTES: Record<string, string> = {
  tally: 'Tally keeps good books — but orders, stock across locations, purchase approvals, payroll and live dashboards sit outside it, in sheets and WhatsApp. That is where most of your gaps are.',
  busy: 'Busy or Marg handle billing and stock basics, but approvals, branches, payroll and live reports for the owner usually live outside them.',
  zoho: 'Zoho Books is good for accounts. Manufacturing, multi-location stock, payroll and controls are where businesses outgrow it.',
  quickbooks: 'QuickBooks handles the accounts, but Indian GST depth, stock, manufacturing and payroll need other tools around it.',
  excel: 'Sheets and notebooks work when you are small — but nothing is live, nothing is controlled, and everything is typed more than once.',
  outside: 'When the books are done outside, you see your numbers late and only through your CA — the business runs blind in between.',
  erp: 'If your ERP leaves these gaps, it is usually set up wrong or has been outgrown. Both can be fixed.',
};

const statusOf = (score: number): ErpStatus => (score >= ERP_TARGET ? 'good' : score >= 50 ? 'push' : 'gap');

export function computeErp(answers: FormAnswers, profile?: Profile): ErpResults {
  const ctx: FormCtx = { answers, stage1: {}, profile };
  const sections = visibleSections(ERP_SECTIONS, ctx);

  const areas: ErpArea[] = [];
  const all: ErpInsight[] = [];
  let hours = 0;
  for (const sec of sections) {
    if (sec.id === 'setup') continue;
    const insights: ErpInsight[] = [];
    for (const f of visibleFields(sec, ctx)) {
      const a = answers[f.id];
      if (!a || a.skipped || !f.insight) continue;
      const opt = f.options?.find((o) => a.selected.includes(o.id));
      if (!opt || opt.score === undefined) continue;
      const h = f.insight.hours?.[opt.id] ?? 0;
      hours += h;
      insights.push({
        id: f.id,
        area: sec.id,
        areaTitle: sec.title,
        kind: opt.score >= ERP_TARGET ? 'strength' : opt.score < 45 ? 'gap' : 'watch',
        title: opt.score >= ERP_TARGET ? f.insight.strength : f.insight.gap,
        answer: opt.label,
        why: f.insight.why,
        fix: f.insight.fix,
        module: f.insight.module,
        score: opt.score,
        hours: h,
      });
    }
    all.push(...insights);
    const score = insights.length ? Math.round(insights.reduce((n, i) => n + i.score, 0) / insights.length) : null;
    areas.push({
      id: sec.id,
      title: sec.title,
      short: sec.short ?? sec.title,
      icon: sec.icon,
      score,
      status: score === null ? null : statusOf(score),
      gaps: insights.filter((i) => i.kind !== 'strength').sort((x, y) => x.score - y.score),
      strengths: insights.filter((i) => i.kind === 'strength'),
    });
  }

  const scored = areas.filter((a) => a.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((n, a) => n + a.score!, 0) / scored.length) : null;
  const gaps = all.filter((i) => i.kind !== 'strength').sort((x, y) => x.score - y.score || y.hours - x.hours);
  const verdict: ErpResults['verdict'] =
    overall === null
      ? null
      : overall >= 75
        ? { title: 'Your setup is in good shape', body: 'Most of the business already runs on proper systems. The few gaps below are worth closing as you grow — an ERP would pull them together.', tone: 'good' }
        : overall >= 50
          ? { title: 'Real gaps your current setup leaves open', body: 'Parts of the business run well, but several jobs still depend on typing, chasing and remembering. These are exactly what an ERP takes over.', tone: 'warn' }
          : { title: 'Your current system is holding you back', body: 'Much of the business runs on re-typing, phone calls and memory. An ERP would take a lot of daily work off your team — and give you the numbers you are missing.', tone: 'gap' };

  // ── The ERPNext plan: modules weighted by how big their gaps are ──
  const weight = new Map<string, number>();
  for (const g of gaps) weight.set(g.module, (weight.get(g.module) ?? 0) + (100 - g.score));
  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  const coreGaps = ranked.filter((m) => CORE.includes(m));
  const phase1Ids = new Set(['accounts', ...coreGaps]);
  for (const m of ranked) if (!CORE.includes(m) && (weight.get(m) ?? 0) >= 120 && phase1Ids.size < 5) phase1Ids.add(m);
  const phase1 = [...phase1Ids].map((m) => MODULES[m]);
  const phase2 = ranked.filter((m) => !phase1Ids.has(m)).map((m) => MODULES[m]);

  const currentId = picked(answers, 'erp_current')[0];
  const currentOther = answers.erp_current?.other?.trim();
  const current = currentId
    ? { label: ERP_SECTIONS[0].fields[1].options!.find((o) => o.id === currentId)!.label, note: CURRENT_NOTES[currentId] ?? '' }
    : currentOther
      ? { label: currentOther, note: '' }
      : undefined;

  const users = num(answers, 'erp_users');
  const sites = num(answers, 'erp_sites');
  let sizeLabel: string | undefined;
  let weeks: string | undefined;
  if (users !== undefined || sites !== undefined) {
    const big = (users ?? 0) > 25 || (sites ?? 1) > 5;
    const mid = (users ?? 0) > 5 || (sites ?? 1) > 1;
    sizeLabel = big ? 'A larger, multi-site setup' : mid ? 'A mid-size setup' : 'A small, quick setup';
    weeks = big ? 'about 3–4 months' : mid ? 'about 6–10 weeks' : 'about 3–5 weeks';
  }
  const whenId = picked(answers, 'erp_ctl_when')[0];
  const when = ERP_SECTIONS.flatMap((s) => s.fields).find((f) => f.id === 'erp_ctl_when')?.options?.find((o) => o.id === whenId)?.label;

  // ── For the team ──
  const points: string[] = [];
  if (overall !== null) points.push(`System health ${overall}/100 — ${verdict!.title.toLowerCase()}${current ? `; today on ${current.label}` : ''}`);
  if (gaps.length) points.push(`Top gaps: ${gaps.slice(0, 3).map((g) => g.title.toLowerCase()).join('; ')}`);
  if (phase1.length) points.push(`Phase 1: ${phase1.join(', ')}${phase2.length ? ` · later: ${phase2.join(', ')}` : ''}`);
  const size = [users !== undefined && `${users} users`, sites !== undefined && `${sites} location${sites === 1 ? '' : 's'}`].filter(Boolean);
  if (size.length || hours) points.push([size.length && `Size: ${size.join(', ')}`, hours && `≈ ${hours} hours a month in work ERPNext would do`].filter(Boolean).join(' · '));
  if (when) points.push(`Wants to start: ${when.toLowerCase()}`);

  const fields = sections.flatMap((s) => visibleFields(s, ctx));
  const answered = fields.filter((f) => {
    const a = answers[f.id];
    return a && !a.skipped && (typeof a.value === 'number' || a.selected.length > 0 || !!a.other?.trim());
  }).length;

  return {
    overall,
    verdict,
    areas,
    topGaps: gaps.slice(0, 6),
    gapCount: gaps.length,
    hours,
    phase1,
    phase2,
    current,
    size: { users, sites, label: sizeLabel, weeks },
    when,
    points,
    answered,
    asked: fields.length,
  };
}

