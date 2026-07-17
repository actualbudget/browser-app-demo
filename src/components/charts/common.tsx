import type { CurrencyFormat } from '../../types';
import { formatMoney } from '../../lib/money';

/** Purple-led data series ramp (used for stacked/multi series). */
export const SERIES = [
  'oklch(70% 0.19 290)',
  'oklch(62% 0.2 295)',
  'oklch(55% 0.17 280)',
  'oklch(66% 0.16 320)',
  'oklch(60% 0.13 250)',
  'oklch(74% 0.13 200)',
];

export const POS = 'oklch(72% 0.16 155)';
export const NEG = 'oklch(66% 0.2 25)';
export const BRAND = 'oklch(62% 0.2 295)';
export const BRAND_BRIGHT = 'oklch(70% 0.19 290)';

interface TooltipRow {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

export function makeCurrencyTooltip(currency: CurrencyFormat, labelMap?: (l: string) => string) {
  return function CurrencyTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipRow[];
    label?: string;
  }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="panel-2 px-3 py-2 text-xs shadow-lg" style={{ background: 'var(--bg-2)' }}>
        {label != null && (
          <div className="mb-1.5 font-semibold text-[var(--text)]">
            {labelMap ? labelMap(label) : label}
          </div>
        )}
        <div className="space-y-1">
          {payload.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                {row.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: row.color }}
                  />
                )}
                {row.name}
              </span>
              <span className="num font-medium text-[var(--text)]">
                {formatMoney(Math.round(row.value ?? 0), currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
}

/** English name for a month-of-year (1-12), e.g. "Mar" / "March". */
export function monthName(monthOfYear: number, style: 'short' | 'long' = 'short'): string {
  return new Date(2000, monthOfYear - 1).toLocaleString('en', { month: style });
}

/** Pretty 'YYYY-MM' -> "Mar '26". */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${monthName(Number(m))} '${y.slice(2)}`;
}
