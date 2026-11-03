// ─────────────────────────────────────────────────────────────
// Talks to the PHP API in /api (same site). In development you can point it elsewhere
// with NEXT_PUBLIC_API_BASE, e.g. http://localhost:8080.
// ─────────────────────────────────────────────────────────────

import type { Answers, OpenSignals, Profile } from './types';

import { BASE_PATH } from './basePath';

// The PHP API sits next to the site, inside the same (sub-)folder. NEXT_PUBLIC_API_BASE can point elsewhere in development.
const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? BASE_PATH).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string | number | undefined> }): Promise<T> {
  const qs = init?.query
    ? '?' +
      new URLSearchParams(
        Object.entries(init.query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/${path}${qs}`, {
      method: init?.method ?? (init?.body !== undefined ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Something went wrong (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

// ── Public (client side of the check) ───────────────────────

export interface SubmissionSummary {
  overall: number | null;
  band: string;
  target: number;
  potential: number | null;
  industryLabel: string | null;
  levelLabel: string | null;
  teamLabel: string | null;
  headache: string | null;
  realGap: string | null;
  realGapId: string | null;
  sections: Record<string, number | null>;
  strengths: number;
  gaps: number;
  quickWins: number;
  answered: number;
  asked: number;
  topGaps: string[];
  /** Our services that fix the gaps, most relevant first. */
  services: string[];
}

export const publicApi = {
  submit: (body: {
    submissionId?: number;
    token?: string;
    profile: Profile;
    answers: Answers;
    summary: SubmissionSummary;
    openText?: string;
  }) =>
    call<{ submissionId: number; token: string }>('submit.php', { body }),
  saveContact: (body: { submissionId: number; token: string; name?: string; phone?: string; email?: string }) =>
    call<{ ok: true }>('save-contact.php', { body }),
  /** A report opened from its short link (/results/#id=…&k=…), e.g. from the CRM. POST keeps the key out of URLs/logs. */
  report: (id: string, k: string) =>
    call<{ profile: unknown; answers: unknown; completedAt: string | null }>('report.php', { body: { id, k } }),
};

// ── "Anything else on your mind?" — the last, open step ─────

export interface OpenReply {
  /** The assistant's next message (a follow-up question, or its closing summary when `done`). */
  reply: string;
  /** The assistant has what it needs, or the message limit was reached: no more messages. */
  done: boolean;
  /** Messages the client can still send. */
  left: number;
  /** Which areas and services it touches (tags only), for the report. */
  signals: OpenSignals;
}

export const openApi = {
  /** Whether the chat is switched on (the server has an AI key), and its first message. */
  status: () => call<{ chat: boolean; greeting: string; maxMessages: number }>('open-problems.php'),
  /** One client message in the chat; the server keeps the conversation and answers with the next question. */
  chat: (body: { submissionId: number; token: string; message: string }) =>
    call<OpenReply>('open-problems.php', { body: { action: 'chat', ...body } }),
  /** A typed note instead of the chat. Returns its tags for the report (empty when the AI is off). */
  note: (body: { submissionId: number; token: string; text: string }) =>
    call<{ ok: true; signals: OpenSignals }>('open-problems.php', { body: { action: 'note', ...body } }),
};

// ── Admin panel ─────────────────────────────────────────────

export type Role = 'admin' | 'bde';
export type LeadStatus = 'new' | 'contacted' | 'meeting' | 'proposal' | 'won' | 'lost';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface TeamMember {
  id: number;
  name: string;
  role: Role;
  active: boolean;
}

export interface LeadRow {
  id: number;
  createdAt: string | null;
  updatedAt: string | null;
  source: 'legacy' | 'health_check_v2' | string;
  company: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  stage: string | null;
  team: string | null;
  score: number | null;
  band: string | null;
  realGap: string | null;
  headache: string | null;
  status: LeadStatus;
  assignedTo: number | null;
  assignedName: string | null;
  followUpOn: string | null;
}

export interface LeadsResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<'all' | LeadStatus, number>;
  stats: { thisWeek: number; avgScore: number | null; won: number; followUpsDue: number; new: number; total: number };
  users: TeamMember[];
}

export interface LeadNote {
  id: number;
  kind: 'note' | 'status' | 'assign' | 'followup' | 'contact' | 'system';
  body: string;
  createdAt: string | null;
  author: string | null;
}

export interface LeadDetail {
  lead: LeadRow & { summary: Partial<SubmissionSummary> | null };
  report: { profile: Profile; answers: Answers } | null;
  legacy: { scores: Record<string, number | null>; analysis: unknown; answers: unknown } | null;
  notes: LeadNote[];
  users: TeamMember[];
}

export interface TeamMemberFull extends TeamMember {
  email: string;
  lastLoginAt: string | null;
  createdAt: string | null;
  openLeads: number;
  wonLeads: number;
}

export interface LeadQuery {
  q?: string;
  status?: string;
  owner?: string;
  sort?: string;
  page?: number;
}

export const adminApi = {
  setupStatus: () => call<{ needsSetup: boolean; setupReady: boolean }>('admin/setup.php'),
  setup: (body: { setupToken: string; name: string; email: string; password: string }) => call<{ user: AdminUser }>('admin/setup.php', { body }),
  login: (body: { email: string; password: string }) => call<{ user: AdminUser }>('admin/login.php', { body }),
  logout: () => call<{ ok: true }>('admin/logout.php', { body: {} }),
  me: () => call<{ user: AdminUser }>('admin/me.php'),
  changePassword: (body: { currentPassword: string; newPassword: string }) => call<{ ok: true }>('admin/me.php', { body }),
  leads: (query: LeadQuery) => call<LeadsResponse>('admin/leads.php', { query: query as Record<string, string | number | undefined> }),
  lead: (id: number) => call<LeadDetail>('admin/lead.php', { query: { id } }),
  updateLead: (
    body: { id: number } & Partial<{
      status: LeadStatus;
      assignedTo: number | null;
      followUpOn: string | null;
      contact: { name?: string; phone?: string; email?: string };
    }>,
  ) => call<LeadDetail>('admin/lead.php', { body }),
  addNote: (submissionId: number, text: string) =>
    call<{ notes: LeadNote[] }>('admin/notes.php', { body: { submissionId, body: text } }),
  team: () => call<{ users: TeamMemberFull[] }>('admin/users.php'),
  saveTeam: (
    body:
      | { action: 'create'; name: string; email: string; password: string; role: Role }
      | { action: 'update'; id: number; name?: string; role?: Role; active?: boolean }
      | { action: 'reset_password'; id: number; password: string },
  ) => call<{ users: TeamMemberFull[] }>('admin/users.php', { body }),
};
