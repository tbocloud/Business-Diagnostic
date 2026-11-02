'use client';

import { Check, Download, Link2, Pencil, Presentation, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import type { Profile, Results } from '@/lib/types';
import { formatDate, goalLabels, NOT_SPECIFIED } from './labels';

interface ReportHeaderProps {
  results: Results;
  profile: Profile;
  completedAt?: string;
  isShared: boolean;
  /** Link to the full-screen review (presenter) mode, when there are key points to show. */
  reviewHref?: string;
  getShareUrl: () => string;
  onEdit: () => void;
  onReset: () => void;
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <li className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </li>
  );
}

export function ReportHeader({
  results,
  profile,
  completedAt,
  isShared,
  reviewHref,
  getShareUrl,
  onEdit,
  onReset,
}: ReportHeaderProps) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [manualUrl, setManualUrl] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (confirmReset) cancelRef.current?.focus();
  }, [confirmReset]);

  const goals = goalLabels(profile);

  const copy = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied('copied');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied('idle'), 2400);
    } catch {
      setManualUrl(url);
      setCopied('manual');
    }
  };

  return (
    <header className="print-avoid-break">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="eyebrow">
          <span className="text-brand">{BRAND.product}</span> · Report
        </p>
        <span className="text-[13px] text-muted">{formatDate(completedAt)}</span>
      </div>
      <h1 className="font-display mt-3 text-balance break-words text-[38px] font-medium leading-[1.04] tracking-[-0.025em] text-ink sm:text-[52px] lg:text-[60px]">
        {results.businessName}
      </h1>
      {profile.ownerName?.trim() && (
        <p className="mt-2 text-[15px] text-ink-2">
          Prepared for <span className="font-semibold text-ink">{profile.ownerName.trim()}</span>
        </p>
      )}

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="About this business">
        {/* Skipped details are left out rather than shown as "Not specified". */}
        {results.industryLabel !== NOT_SPECIFIED && <Chip label="Industry" value={results.industryLabel} />}
        {results.levelLabel !== NOT_SPECIFIED && <Chip label="Stage" value={results.levelLabel} />}
        {results.teamLabel !== NOT_SPECIFIED && <Chip label="Team" value={results.teamLabel} />}
        {goals.length > 0 && <Chip label={goals.length === 1 ? 'Goal' : 'Goals'} value={goals.join(' · ')} />}
      </ul>

      <div className="no-print mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        {reviewHref && (
          <ButtonLink href={reviewHref} className="max-sm:w-full">
            <Presentation className="h-4 w-4" aria-hidden="true" />
            Start review
          </ButtonLink>
        )}
        <Button variant="secondary" onClick={() => window.print()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </Button>
        <Button variant="secondary" onClick={copy} aria-describedby="copy-status">
          {copied === 'copied' ? (
            <Check className="h-4 w-4 text-ok-ink" aria-hidden="true" strokeWidth={2.5} />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden="true" />
          )}
          {copied === 'copied' ? 'Copied!' : 'Copy share link'}
        </Button>
        {!isShared && (
          <>
            <Button variant="quiet" onClick={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit answers
            </Button>
            {!confirmReset && (
              <Button variant="quiet" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            )}
          </>
        )}
        <span id="copy-status" className="sr-only" aria-live="polite">
          {copied === 'copied' ? 'Share link copied to clipboard' : ''}
        </span>
      </div>

      {copied === 'manual' && (
        <div className="no-print mt-3 animate-rise rounded-xl border border-line bg-card p-3">
          <label htmlFor="share-url" className="text-[13px] font-semibold text-ink">
            Copy this link to share your report
          </label>
          <input
            id="share-url"
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="field mt-1.5 text-[13px]"
          />
        </div>
      )}

      {confirmReset && (
        <div
          role="alertdialog"
          aria-labelledby="reset-title"
          aria-describedby="reset-desc"
          className="no-print mt-3 animate-rise rounded-2xl border border-line-strong bg-card p-4 sm:flex sm:items-center sm:gap-4"
        >
          <div className="flex-1">
            <p id="reset-title" className="font-semibold text-ink">
              Start a new check?
            </p>
            <p id="reset-desc" className="text-[14px] text-ink-2">
              This clears every answer for {results.businessName} from this device. Copy your share link first if you want to keep this report.
            </p>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="secondary" className="border-risk/40 text-risk-ink" onClick={onReset}>
              Yes, start over
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
