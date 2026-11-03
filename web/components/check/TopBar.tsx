import Link from 'next/link';
import { Check, FileText } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function TopBar({ progress, showReportLink }: { progress: number; showReportLink: boolean }) {
  const pct = Math.round(progress * 100);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-[2px] supports-[backdrop-filter]:bg-paper/85">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
        <Logo compact />
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-4 sm:gap-6">
          <div className="flex w-full max-w-[280px] items-center gap-3">
            <div
              role="progressbar"
              aria-label="Overall progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-9 text-right text-[12.5px] font-semibold tabular-nums text-ink-2">{pct}%</span>
          </div>
          <span className="hidden items-center gap-1.5 whitespace-nowrap text-[12.5px] text-muted lg:inline-flex">
            <Check className="h-4 w-4 text-ok-ink" aria-hidden="true" strokeWidth={2.25} />
            Progress saved automatically
          </span>
          {showReportLink && (
            <Link
              href="/results"
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[13.5px] font-semibold text-brand hover:bg-brand-soft/60"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="max-sm:sr-only">My report</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
