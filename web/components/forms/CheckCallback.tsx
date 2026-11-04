'use client';

import { CheckCircle2, Loader2, PhoneCall } from 'lucide-react';
import { useId, useState } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { Button } from '@/components/ui/Button';
import { ApiError, publicApi } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { ensureCheck } from '@/lib/checks';
import type { CheckKind, FormAnswers, FormState } from '@/lib/forms';

/**
 * "Call me back" on a Stage 2 / ERP check report — like Stage 1's: the phone / email go onto
 * this check's record and its CRM record. Only on the client's own report.
 */
export function CheckCallback({
  kind,
  useStore,
  points,
  answers,
  businessName,
  ownerName,
  title,
  body,
}: {
  kind: CheckKind;
  useStore: UseBoundStore<StoreApi<FormState>>;
  /** The team's summary points, in case the check has to be saved first. */
  points: () => string[];
  answers?: () => FormAnswers;
  businessName: string;
  ownerName: string;
  title: string;
  body: string;
}) {
  const saved = useStore((s) => s.contactSaved);
  const details = useStore((s) => s.details);
  const [name, setName] = useState(details.ownerName || ownerName);
  const [phone, setPhone] = useState(details.phone);
  const [email, setEmail] = useState(details.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { name: useId(), phone: useId(), email: useId() };

  if (saved) {
    return (
      <section id="callback" className="no-print flex items-start gap-3 rounded-[22px] border border-ok/30 bg-ok-soft px-5 py-5 sm:px-7">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok-ink" aria-hidden="true" />
        <div>
          <p className="text-[15px] font-semibold text-ink">Thanks — we’ve got your details.</p>
          <p className="mt-1 text-[14px] text-ink-2">
            Someone from {BRAND.company} will be in touch to go through this report for {businessName}.
          </p>
        </div>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() && !email.trim()) return setError('Add a phone number or an email so we can reach you.');
    setBusy(true);
    try {
      const saved = await ensureCheck(kind, useStore, points, answers);
      if (!saved) throw new ApiError('We couldn’t save your report just now. Please try again.', 0);
      await publicApi.saveContact({
        submissionId: saved.id,
        token: saved.token,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      useStore.getState().setContactSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="callback" aria-labelledby={`${ids.name}-title`} className="no-print overflow-hidden rounded-[22px] border border-brand/25 bg-card shadow-card">
      <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-10">
        <div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white" aria-hidden="true">
            <PhoneCall className="h-5 w-5" />
          </span>
          <h2 id={`${ids.name}-title`} className="font-display mt-4 text-[22px] font-medium leading-tight text-ink sm:text-[26px]">
            {title}
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
        </div>
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={ids.name} className="mb-1 block text-[13px] font-semibold text-ink">
              Your name
            </label>
            <input id={ids.name} className="field" autoComplete="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor={ids.phone} className="mb-1 block text-[13px] font-semibold text-ink">
              Phone / WhatsApp
            </label>
            <input
              id={ids.phone}
              className="field"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              maxLength={30}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={ids.email} className="mb-1 block text-[13px] font-semibold text-ink">
              Email <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={ids.email}
              className="field"
              type="email"
              autoComplete="email"
              placeholder="you@business.com"
              value={email}
              maxLength={190}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-[13.5px] font-medium text-risk-ink sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Call me back
            </Button>
            <span className="text-[12.5px] text-muted">Only our team sees this. No spam.</span>
          </div>
        </form>
      </div>
    </section>
  );
}
