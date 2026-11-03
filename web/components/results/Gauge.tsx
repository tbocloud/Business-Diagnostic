'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useCountUp } from '@/hooks/useCountUp';

// A 270° meter. Track = a lighter step of the same teal ramp; fill = the "You" series;
// the stage target is an ink tick across the track.
const START = 135;
const SWEEP = 270;
const CX = 120;
const CY = 116;
const R = 86;

/** Rounded so server and browser render identical coordinates (trig can differ in the last digit). */
function polar(deg: number, r = R): [number, number] {
  const rad = (deg * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(CX + r * Math.cos(rad)), round(CY + r * Math.sin(rad))];
}

const [sx, sy] = polar(START);
const [ex, ey] = polar(START + SWEEP);
const ARC = `M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ex} ${ey}`;

interface GaugeProps {
  value: number | null;
  target: number;
  className?: string;
  /** Smaller type for previews. */
  size?: 'lg' | 'sm';
  showTargetLabel?: boolean;
  /** Replaces the number in the middle (e.g. when the score is already shown big next to it). */
  center?: React.ReactNode;
}

export function Gauge({ value, target, className, size = 'lg', showTargetLabel = true, center }: GaugeProps) {
  const shown = useCountUp(value);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    const fallback = setTimeout(() => setDrawn(true), 120); // in case rAF is paused
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(fallback);
    };
  }, []);

  const tAngle = START + (SWEEP * target) / 100;
  const [t1x, t1y] = polar(tAngle, R - 13);
  const [t2x, t2y] = polar(tAngle, R + 13);
  const [lx, ly] = polar(tAngle, R + 26);
  const anchor = Math.cos((tAngle * Math.PI) / 180) > 0.2 ? 'start' : Math.cos((tAngle * Math.PI) / 180) < -0.2 ? 'end' : 'middle';
  const fillLen = value === null ? 0 : drawn ? Math.max(0.5, value) : 0;

  return (
    <div
      role="img"
      aria-label={
        value === null
          ? 'Overall health score: not enough answers yet.'
          : `Overall health score ${value} out of 100. Target for your stage: ${target}.`
      }
      className={clsx('relative mx-auto aspect-[240/214] w-full', className)}
    >
      <svg viewBox="0 0 240 214" className="h-full w-full overflow-visible" aria-hidden="true">
        <path d={ARC} fill="none" stroke="rgb(var(--data-track))" strokeWidth="16" strokeLinecap="round" />
        {value !== null && (
          <path
            d={ARC}
            pathLength={100}
            fill="none"
            stroke="rgb(var(--data))"
            strokeWidth="16"
            strokeLinecap="round"
            className="gauge-fill"
            style={
              {
                strokeDasharray: `${fillLen} 100`,
                transition: 'stroke-dasharray 1200ms cubic-bezier(0.2, 0.7, 0.2, 1)',
                '--gauge-final': `${Math.max(0.5, value)}px`,
              } as React.CSSProperties
            }
          />
        )}
        <line
          x1={t1x}
          y1={t1y}
          x2={t2x}
          y2={t2y}
          stroke="rgb(var(--card))"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke="rgb(var(--ink))" strokeWidth="2.5" strokeLinecap="round" />
        {showTargetLabel && (
          <text
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-ink-2 font-sans"
            style={{ fontSize: size === 'lg' ? 11 : 13, fontWeight: 600 }}
          >
            Target {target}
          </text>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        {center ?? (
          <>
        <span
          className={clsx(
            'font-display font-medium leading-none tracking-[-0.03em] text-ink',
            size === 'lg' ? 'text-[64px] sm:text-[72px]' : 'text-[38px]',
          )}
        >
          {value === null ? (
            '—'
          ) : (
            <>
              <span className="print:hidden">{shown}</span>
              <span className="hidden print:inline">{value}</span>
            </>
          )}
        </span>
        {size === 'lg' && (
          <span className="mt-1 text-[13px] font-medium text-muted">{value === null ? 'not enough answers' : 'out of 100'}</span>
        )}
          </>
        )}
      </div>
    </div>
  );
}
