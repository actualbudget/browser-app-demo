import type { CurrencyFormat } from '../../types';
import { formatMoney } from '../../lib/money';
import { SERIES } from '../charts/common';

export interface RankItem {
  id: string;
  name: string;
  total: number;
  count?: number;
}

interface RankListProps {
  items: RankItem[];
  currency: CurrencyFormat;
  colorize?: boolean;
}

/** Horizontal proportional bars for the top-8 ranked spend (categories, payees). */
export function RankList({ items, currency, colorize = false }: RankListProps) {
  const top = items.slice(0, 8);
  const max = top.reduce((m, x) => Math.max(m, x.total), 0) || 1;

  if (top.length === 0) {
    return <p className="text-sm text-[var(--text-faint)]">No spending recorded.</p>;
  }

  return (
    <ol className="space-y-2.5">
      {top.map((item, i) => {
        const pct = (item.total / max) * 100;
        const color = colorize ? SERIES[i % SERIES.length] : 'oklch(62% 0.2 295)';
        return (
          <li key={item.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-[var(--text)]">{item.name}</span>
              <span className="num shrink-0 text-sm font-medium text-[var(--text-dim)]">
                {formatMoney(item.total, currency)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: color,
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
