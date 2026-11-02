'use client';

import { CheckCircle2, Loader2, PhoneCall } from 'lucide-react';
import { useId, useState } from 'react';
import { ApiError, publicApi } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { useCheck } from '@/lib/store';
import { syncSubmission } from '@/lib/submit';
import { Button } from '@/components/ui/Button';

/**
 * "Want us to walk you through this?" — the client leaves a phone/email, which turns
 * their saved report into a lead in the BDE panel. Only shown on the client's own report.
 */
export function ContactCapture({ businessName }: { businessName: string }) {
  const ownerName = useCheck((s) => s.profile.ownerName ?? '');
  const saved = useCheck((s) => s.contactSaved);
  const [name, setName] = useState(ownerName);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { name: useId(), phone: useId(), email: useId() };

  if (saved) {
    return (
      <section className="no-print flex items-start gap-3 rounded-[22px] border border-ok/30 bg-ok-soft px-5 py-5 sm:px-7">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok-ink" aria-hidden="true" />
        <div>
          <p className="text-[15px] font-semibold text-ink">Thanks — we’ve got your details.</p>
          <p className="mt-1 text-[14px] text-ink-2">
            Someone from {BRAND.company} will be in touch to walk you through your results for {businessName}.
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
      let s = useCheck.getState();
      if (!s.submissionId || !s.submissionToken) {
        await syncSubmission();
        s = useCheck.getState();
      }
      if (!s.submissionId || !s.submissionToken) throw new ApiError('We couldn’t save your report just now. Please try again.', 0);
      await publicApi.saveContact({
        submissionId: s.submissionId,
        token: s.submissionToken,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      useCheck.getState().setContactSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="contact-capture-title"
      className="no-print overflow-hidden rounded-[22px] border border-brand/25 bg-card shadow-card"
    >
      <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-10">
        <div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white" aria-hidden="true">
            <PhoneCall className="h-5 w-5" />
          </span>
          <h2 id="contact-capture-title" className="font-display mt-4 text-[22px] font-medium leading-tight text-ink sm:text-[26px]">
            Want us to walk you through this?
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Leave a number and a {BRAND.company} advisor will call you — free, about 30 minutes, to agree the first three fixes.
          </p>
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
