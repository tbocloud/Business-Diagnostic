'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { adminApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAdminUser } from './AdminShell';
import { Card, ErrorText, FieldLabel } from './ui';

export function AccountPage() {
  const me = useAdminUser();
  const ids = { cur: useId(), next: useId(), again: useId() };
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (form.next !== form.again) return setError('The two new passwords don’t match.');
    setBusy(true);
    try {
      await adminApi.changePassword({ currentPassword: form.current, newPassword: form.next });
      setDone(true);
      setForm({ current: '', next: '', again: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[32rem]">
      <h1 className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">Account</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {me.name} · {me.email} · {me.role === 'admin' ? 'Admin' : 'BDE'}
      </p>
      <Card className="mt-6 px-5 py-5">
        <h2 className="text-[16px] font-semibold text-ink">Change your password</h2>
        <form onSubmit={submit} className="mt-3 grid gap-3">
          <div>
            <FieldLabel htmlFor={ids.cur}>Current password</FieldLabel>
            <input id={ids.cur} className="field" type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor={ids.next}>New password (8+ characters)</FieldLabel>
            <input id={ids.next} className="field" type="password" autoComplete="new-password" minLength={8} required value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor={ids.again}>New password again</FieldLabel>
            <input id={ids.again} className="field" type="password" autoComplete="new-password" minLength={8} required value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} />
          </div>
          <ErrorText>{error}</ErrorText>
          {done && (
            <p role="status" className="text-[14px] font-medium text-ok-ink">
              Password changed.
            </p>
          )}
          <Button type="submit" disabled={busy} className="justify-self-start">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
