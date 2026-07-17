import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { CurrencyFormat } from '../../types';
import type { MonthFlow } from '../../analysis/cashflow';
import { formatCompact } from '../../lib/money';
import { POS, NEG, BRAND_BRIGHT, makeCurrencyTooltip, monthLabel } from './common';

interface Props {
  data: MonthFlow[];
  currency: CurrencyFormat;
  height?: number;
}

/** Income (up) vs expense (down) bars with a net savings line. */
export function CashflowBars({ data, currency, height = 240 }: Props) {
  const Tip = makeCurrencyTooltip(currency, monthLabel);
  const rows = data.map((d) => ({
    month: d.month,
    Income: d.income,
    Expense: -d.expense,
    Net: d.net,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} stackOffset="sign">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis width={52} tickFormatter={(v) => formatCompact(v, currency)} tickLine={false} axisLine={false} />
        <Tooltip content={<Tip />} cursor={{ fill: 'oklch(62% 0.2 295 / 0.08)' }} />
        <Bar dataKey="Income" fill={POS} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="Expense" fill={NEG} radius={[0, 0, 3, 3]} maxBarSize={22} />
        <Line type="monotone" dataKey="Net" stroke={BRAND_BRIGHT} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
