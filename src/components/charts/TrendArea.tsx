import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { CurrencyFormat } from '../../types';
import { formatCompact } from '../../lib/money';
import { BRAND_BRIGHT, makeCurrencyTooltip, monthLabel } from './common';

interface TrendAreaProps {
  data: { month: string; value: number }[];
  currency: CurrencyFormat;
  height?: number;
}

/** Single-series month area chart (net worth over time). */
export function TrendArea({ data, currency, height = 220 }: TrendAreaProps) {
  const Tip = makeCurrencyTooltip(currency, monthLabel);
  const rows = data.map((d) => ({ month: d.month, 'Net worth': d.value }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_BRIGHT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND_BRIGHT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          width={52}
          tickFormatter={(v) => formatCompact(v, currency)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<Tip />} />
        <Area
          type="monotone"
          dataKey="Net worth"
          stroke={BRAND_BRIGHT}
          strokeWidth={2}
          fill="url(#grad-trend)"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
