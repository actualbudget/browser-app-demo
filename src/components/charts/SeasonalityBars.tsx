import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { CurrencyFormat } from '../../types';
import { formatCompact } from '../../lib/money';
import { SERIES, makeCurrencyTooltip, monthName } from './common';

interface SeasonalityBarsProps {
  data: { monthOfYear: number; avg: number }[];
  currency: CurrencyFormat;
  height?: number;
}

/** Average spend per calendar month as a bar chart. */
export function SeasonalityBars({ data, currency, height = 200 }: SeasonalityBarsProps) {
  if (!data.some((d) => d.avg > 0)) {
    return <p className="text-sm text-[var(--text-faint)]">Not enough data yet.</p>;
  }
  const rows = data.map((d) => ({
    month: monthName(d.monthOfYear),
    full: monthName(d.monthOfYear, 'long'),
    'Avg / month': d.avg,
  }));
  const Tip = makeCurrencyTooltip(currency, (short) => rows.find((r) => r.month === short)?.full ?? short);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} interval={0} />
        <YAxis
          width={52}
          tickFormatter={(v) => formatCompact(v, currency)}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<Tip />} cursor={{ fill: 'var(--line)', opacity: 0.35 }} />
        <Bar dataKey="Avg / month" radius={[3, 3, 0, 0]}>
          {rows.map((row, i) => (
            <Cell key={row.month} fill={SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
