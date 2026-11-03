import Link from 'next/link';
import clsx from 'clsx';
import { forwardRef } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'quiet' | 'link';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none disabled:cursor-not-allowed active:translate-y-px';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_6px_16px_-8px_rgb(var(--brand)/0.7)] hover:bg-brand-deep disabled:bg-line-strong disabled:text-ink-2 disabled:shadow-none',
  accent: 'bg-accent text-ink shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)] hover:bg-[#EC9A47]',
  secondary:
    'bg-card text-ink border border-line-strong hover:border-ink-2/60 hover:bg-white disabled:text-muted disabled:hover:border-line-strong',
  quiet: 'text-ink-2 hover:text-ink hover:bg-ink/[0.05] disabled:text-muted/60',
  link: 'text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand',
};

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] rounded-xl px-4 text-[15px]',
  lg: 'min-h-[52px] rounded-[14px] px-6 text-[16px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(base, variants[variant], variant !== 'link' && sizes[size], className)}
        {...props}
      />
    );
  },
);

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  ...props
}: CommonProps & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={clsx(base, variants[variant], variant !== 'link' && sizes[size], className)} {...props} />
  );
}
