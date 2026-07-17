import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { CurrencyFormat } from '../../types';
import type { ProjectionPoint } from '../../analysis/fire';
import { formatCompact, formatMoney } from '../../lib/money';
import { BRAND_BRIGHT } from './common';

export interface ProjectionLine {
  value: number;
  label: string;
  color: string;
  dash?: string;
}

interface Props {
  data: ProjectionPoint[];
  lines: ProjectionLine[];
  currency: CurrencyFormat;
  height?: number;
}

/** Net-worth projection with FIRE milestone reference lines. */
export function ProjectionChart({ data, lines, currency, height = 240 }: Props) {
  const rows = data.map((d) => ({ year: d.year, NetWorth: d.netWorth }));
  const visibleLines = lines.filter((l) => isFinite(l.value) && l.value > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_BRIGHT} stopOpacity={0.4} />
            <stop offset="100%" stopColor={BRAND_BRIGHT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="year"
          tickFormatter={(y) => (y === 0 ? 'now' : `+${y}y`)}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis width={52} tickFormatter={(v) => formatCompact(v, currency)} tickLine={false} axisLine={false} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload && payload[0] ? (
              <div className="panel-2 px-3 py-2 text-xs" style={{ background: 'var(--bg-2)' }}>
                <div className="mb-1 font-semibold text-[var(--text)]">
                  {label === 0 ? 'Today' : `In ${label} years`}
                </div>
                <div className="num text-[var(--text-dim)]">
                  {formatMoney(Math.round(payload[0].value as number), currency)}
                </div>
              </div>
            ) : null
          }
        />
        {visibleLines.map((l) => (
          <ReferenceLine
            key={l.label}
            y={l.value}
            stroke={l.color}
            strokeDasharray={l.dash ?? '4 4'}
            ifOverflow="extendDomain"
            label={{
              value: `${l.label} ${formatCompact(l.value, currency)}`,
              position: 'insideTopRight',
              fill: l.color,
              fontSize: 11,
            }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="NetWorth"
          name="Net worth"
          stroke={BRAND_BRIGHT}
          strokeWidth={2}
          fill="url(#proj)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
