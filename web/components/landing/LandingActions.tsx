'use client';

import { ArrowRight, Boxes, FileText, History } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import { useCheck } from '@/lib/store';
import { Button, ButtonLink } from '@/components/ui/Button';

export function LandingActions() {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const businessName = useCheck((s) => s.profile.businessName.trim());
  const hasAnswers = useCheck((s) => Object.keys(s.answers).length > 0);
  const startedAt = useCheck((s) => s.startedAt);
  const completedAt = useCheck((s) => s.completedAt);
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const hasProgress = hydrated && (!!businessName || hasAnswers || !!startedAt);
  const completed = hydrated && !!completedAt;

  const startFresh = () => {
    useCheck.getState().reset();
    router.push('/check');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {hasProgress ? (
          <Button size="lg" onClick={() => setConfirming(true)} aria-expanded={confirming}>
            Start your free check
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <ButtonLink href="/check" size="lg">
            Start your free check
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        )}
        {completed ? (
          <ButtonLink href="/results" variant="secondary" size="lg" className="animate-fade">
            <FileText className="h-4 w-4" aria-hidden="true" />
            View your last report
          </ButtonLink>
        ) : hasProgress ? (
          <ButtonLink href="/check" variant="secondary" size="lg" className="animate-fade">
            <History className="h-4 w-4" aria-hidden="true" />
            Resume where you left off
          </ButtonLink>
        ) : null}
      </div>

      {/* Only here for an ERP? A short check of its own. */}
      <Link
        href="/erp"
        className="group mt-4 inline-flex max-w-xl items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[14px] text-ink-2 shadow-card transition-colors hover:border-brand"
      >
        <Boxes className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Only looking at ERP?</strong> Take the 5-minute ERP check instead
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>

      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby="fresh-title"
          aria-describedby="fresh-desc"
          className="mt-4 max-w-xl animate-rise rounded-2xl border border-line-strong bg-card p-4 shadow-lift"
        >
          <p id="fresh-title" className="font-semibold text-ink">
            Start a fresh check?
          </p>
          <p id="fresh-desc" className="mt-0.5 text-[14px] text-ink-2">
            You already have {completed ? 'a report' : 'a check in progress'}
            {businessName ? ` for ${businessName}` : ''} on this device. Starting fresh clears those answers.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button ref={keepRef} variant="secondary" onClick={() => setConfirming(false)}>
              Keep my answers
            </Button>
            <Button variant="secondary" onClick={startFresh} className="border-ink-2/40">
              Yes, start fresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
