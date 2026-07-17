import type { ReactNode } from 'react';

interface MetricProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'pos' | 'neg' | 'warn';
}

const toneColor: Record<NonNullable<MetricProps['tone']>, string> = {
  default: 'var(--text)',
  pos: 'var(--pos)',
  neg: 'var(--neg)',
  warn: 'var(--warn)',
};

/** A label + figure pair. Deliberately not the SaaS hero-metric template. */
export function Metric({ label, value, sub, tone = 'default' }: MetricProps) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num mt-1.5 text-2xl font-semibold leading-none" style={{ color: toneColor[tone] }}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-[var(--text-dim)]">{sub}</div>}
    </div>
  );
}
