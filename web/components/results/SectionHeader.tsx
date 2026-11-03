import clsx from 'clsx';

export function SectionHeader({
  id,
  eyebrow,
  title,
  lead,
  action,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('print-keep-with-next mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 print:block', className)}>
      <div className="max-w-2xl">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden="true" className="h-px w-6 bg-accent" />
          {eyebrow}
        </p>
        <h2
          id={id}
          className="font-display mt-2 text-balance text-[26px] font-medium leading-[1.15] tracking-[-0.01em] text-ink sm:text-[32px]"
        >
          {title}
        </h2>
        {lead && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
