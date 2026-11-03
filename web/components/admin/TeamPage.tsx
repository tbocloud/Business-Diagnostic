'use client';

import clsx from 'clsx';
import { KeyRound, Loader2, UserPlus, Wand2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { adminApi, ApiError, type Role, type TeamMemberFull } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAdminUser } from './AdminShell';
import { Card, ErrorText, FieldLabel, timeAgo } from './ui';

function makePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function TeamPage() {
  const me = useAdminUser();
  const [users, setUsers] = useState<TeamMemberFull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .team()
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the team'));
  }, []);

  const save = async (body: Parameters<typeof adminApi.saveTeam>[0], done?: string) => {
    setError(null);
    setNotice(null);
    try {
      const d = await adminApi.saveTeam(body);
      setUsers(d.users);
      if (done) setNotice(done);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
      return false;
    }
  };

  if (me.role !== 'admin') {
    return <Card className="px-6 py-12 text-center text-[15px] text-ink">Only an admin can manage the team.</Card>;
  }

  return (
    <div>
      <h1 className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">Team</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        BDEs see their own leads plus unassigned ones. Admins see everything and can assign leads.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          {notice && (
            <p role="status" className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-2.5 text-[14px] text-ink">
              {notice}
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          {!users ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading team" />
            </div>
          ) : (
            users.map((u) => <MemberRow key={u.id} user={u} isMe={u.id === me.id} onSave={save} />)
          )}
        </div>
        <AddMember onSave={save} />
      </div>
    </div>
  );
}

function MemberRow({
  user,
  isMe,
  onSave,
}: {
  user: TeamMemberFull;
  isMe: boolean;
  onSave: (b: Parameters<typeof adminApi.saveTeam>[0], done?: string) => Promise<boolean>;
}) {
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const pwId = useId();

  const run = async (b: Parameters<typeof adminApi.saveTeam>[0], done?: string) => {
    setBusy(true);
    const ok = await onSave(b, done);
    setBusy(false);
    return ok;
  };

  return (
    <Card className={clsx('px-4 py-4 sm:px-5', !user.active && 'opacity-70')}>
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-[16px] font-semibold text-brand"
          aria-hidden="true"
        >
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">
            {user.name}
            {isMe && <span className="ml-1.5 text-[12.5px] font-normal text-muted">(you)</span>}
            {!user.active && <span className="ml-2 rounded bg-paper-deep px-1.5 py-px text-[11.5px] font-semibold text-ink-2">Deactivated</span>}
          </p>
          <p className="truncate text-[13px] text-ink-2">{user.email}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {user.openLeads} open lead{user.openLeads === 1 ? '' : 's'} · {user.wonLeads} won · last login {user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'never'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={`Role for ${user.name}`}
            className="field !w-auto !py-1.5 text-[13.5px]"
            value={user.role}
            disabled={busy || isMe}
            onChange={(e) => void run({ action: 'update', id: user.id, role: e.target.value as Role }, `${user.name} is now ${e.target.value === 'admin' ? 'an admin' : 'a BDE'}.`)}
          >
            <option value="bde">BDE</option>
            <option value="admin">Admin</option>
          </select>
          <Button variant="secondary" className="!min-h-[36px] !px-3 !text-[13.5px]" disabled={busy} onClick={() => setResetting((v) => !v)}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Reset password
          </Button>
          {!isMe && (
            <Button
              variant="quiet"
              className="!min-h-[36px] !px-3 !text-[13.5px]"
              disabled={busy}
              onClick={() =>
                void run(
                  { action: 'update', id: user.id, active: !user.active },
                  user.active ? `${user.name} can no longer log in. Their open leads went back to the unassigned pool.` : `${user.name} can log in again.`,
                )
              }
            >
              {user.active ? 'Deactivate' : 'Reactivate'}
            </Button>
          )}
        </div>
      </div>
      {resetting && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run({ action: 'reset_password', id: user.id, password }, `New password set for ${user.name}. Share it with them privately.`)) {
              setResetting(false);
              setPassword('');
            }
          }}
        >
          <div className="min-w-[14rem] flex-1">
            <FieldLabel htmlFor={pwId}>New password (8+ characters)</FieldLabel>
            <input id={pwId} className="field" value={password} minLength={8} required onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button variant="quiet" onClick={() => setPassword(makePassword())}>
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Generate
          </Button>
          <Button type="submit" disabled={busy || password.length < 8}>
            Save password
          </Button>
        </form>
      )}
    </Card>
  );
}

function AddMember({ onSave }: { onSave: (b: Parameters<typeof adminApi.saveTeam>[0], done?: string) => Promise<boolean> }) {
  const ids = { name: useId(), email: useId(), role: useId(), pass: useId() };
  const [form, setForm] = useState({ name: '', email: '', role: 'bde' as Role, password: '' });
  const [busy, setBusy] = useState(false);

  return (
    <Card className="h-fit px-4 py-5 sm:px-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
        <UserPlus className="h-4 w-4 text-brand" aria-hidden="true" />
        Add a team member
      </h2>
      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await onSave(
            { action: 'create', ...form },
            `${form.name} was added. Send them the panel link (${window.location.origin}/admin/), their email and this password: ${form.password}`,
          );
          setBusy(false);
          if (ok) setForm({ name: '', email: '', role: 'bde', password: '' });
        }}
      >
        <div>
          <FieldLabel htmlFor={ids.name}>Name</FieldLabel>
          <input id={ids.name} className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <FieldLabel htmlFor={ids.email}>Email</FieldLabel>
          <input id={ids.email} className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <FieldLabel htmlFor={ids.role}>Role</FieldLabel>
          <select id={ids.role} className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="bde">BDE — works their own leads</option>
            <option value="admin">Admin — sees everything, manages team</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor={ids.pass}>Temporary password</FieldLabel>
          <div className="flex gap-2">
            <input
              id={ids.pass}
              className="field"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button variant="secondary" aria-label="Generate a password" onClick={() => setForm({ ...form, password: makePassword() })}>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-1 text-[12px] text-muted">They can change it under Account after logging in.</p>
        </div>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Add member
        </Button>
      </form>
    </Card>
  );
}
