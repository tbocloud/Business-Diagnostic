// ─────────────────────────────────────────────────────────────
// Talks to the PHP API in /api (same site). In development you can point it elsewhere
// with NEXT_PUBLIC_API_BASE, e.g. http://localhost:8080.
// ─────────────────────────────────────────────────────────────

import type { Answers, Profile } from './types';

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

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
}

export const publicApi = {
  submit: (body: { submissionId?: number; token?: string; profile: Profile; answers: Answers; summary: SubmissionSummary }) =>
    call<{ submissionId: number; token: string }>('submit.php', { body }),
  saveContact: (body: { submissionId: number; token: string; name?: string; phone?: string; email?: string }) =>
    call<{ ok: true }>('save-contact.php', { body }),
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
  kind: 'note' | 'status' | 'assign' | 'followup' | 'system';
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
  setupStatus: () => call<{ needsSetup: boolean }>('admin/setup.php'),
  setup: (body: { name: string; email: string; password: string }) => call<{ user: AdminUser }>('admin/setup.php', { body }),
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
