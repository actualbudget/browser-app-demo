import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { CurrencyFormat } from '../../types';
import { formatCompact } from '../../lib/money';
import { SERIES, makeCurrencyTooltip, monthLabel } from './common';

interface Props {
  rows: Record<string, number | string>[];
  keys: string[];
  currency: CurrencyFormat;
  height?: number;
}

/** Stacked area of spend per top category over time. */
export function CategoryTrends({ rows, keys, currency, height = 260 }: Props) {
  const Tip = makeCurrencyTooltip(currency, monthLabel);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis width={52} tickFormatter={(v) => formatCompact(v, currency)} tickLine={false} axisLine={false} />
        <Tooltip content={<Tip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'var(--text-dim)', paddingTop: 8 }}
        />
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stackId="1"
            stroke={SERIES[i % SERIES.length]}
            fill={SERIES[i % SERIES.length]}
            fillOpacity={0.5}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
