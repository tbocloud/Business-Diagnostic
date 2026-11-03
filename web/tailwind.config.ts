import type { Config } from 'tailwindcss';

// Every color is a CSS variable (RGB channels) defined in app/globals.css,
// so opacity modifiers like `bg-brand/10` keep working.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: token('paper'), deep: token('paper-deep') },
        card: token('card'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2') },
        muted: token('muted'),
        brand: { DEFAULT: token('brand'), deep: token('brand-deep'), soft: token('brand-soft') },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft'), ink: token('accent-ink'), light: token('accent-light') },
        data: { DEFAULT: token('data'), track: token('data-track') },
        ok: { DEFAULT: token('ok'), ink: token('ok-ink'), soft: token('ok-soft') },
        warn: { DEFAULT: token('warn'), ink: token('warn-ink'), soft: token('warn-soft') },
        risk: { DEFAULT: token('risk'), ink: token('risk-ink'), soft: token('risk-soft') },
        na: { DEFAULT: token('na'), ink: token('na-ink'), soft: token('na-soft') },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        report: '75rem',
        question: '45rem',
      },
      boxShadow: {
        card: '0 1px 0 rgb(var(--ink) / 0.04), 0 1px 3px rgb(var(--ink) / 0.06)',
        lift: '0 2px 0 rgb(var(--ink) / 0.04), 0 10px 24px -12px rgb(var(--ink) / 0.22)',
        sheet: '0 1px 0 rgb(var(--ink) / 0.05), 0 30px 60px -30px rgb(var(--ink) / 0.35), 0 12px 24px -16px rgb(var(--ink) / 0.18)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(18px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-back': {
          from: { opacity: '0', transform: 'translateX(-18px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(0.97)' },
          '70%': { transform: 'scale(1.015)' },
          '100%': { transform: 'scale(1)' },
        },
        'badge-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0.4' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        rise: 'rise 520ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'slide-in': 'slide-in 380ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'slide-back': 'slide-back 380ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        pop: 'pop 320ms cubic-bezier(0.3, 0.7, 0.3, 1)',
        'badge-pop': 'badge-pop 300ms cubic-bezier(0.3, 0.7, 0.3, 1)',
        fade: 'fade 400ms ease both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
