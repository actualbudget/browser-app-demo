import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSnapshot, disconnect } from '../api/client';
import { loadSettings, saveSettings } from '../lib/settings';
import type { Settings as SettingsType, Assumptions } from '../types';
import { deriveBase, deriveFinance, type Derived } from '../state/derive';
import { formatMoney } from '../lib/money';
import { formatYears, formatMonths, formatPct } from '../lib/format';
import { Panel } from './ui/Panel';
import { Metric } from './ui/Metric';
import { Donut } from './ui/Donut';
import { Gauge } from './ui/Gauge';
import { RankList } from './ui/RankList';
import { TrendArea } from './charts/TrendArea';
import { CashflowBars } from './charts/CashflowBars';
import { CategoryTrends } from './charts/CategoryTrends';
import { SeasonalityBars } from './charts/SeasonalityBars';
import { POS, NEG, BRAND, monthLabel } from './charts/common';
import { WhatIf } from './WhatIf';
import { Settings } from './Settings';

export function Dashboard({ onDisconnect }: { onDisconnect: () => void }) {
  const { data: snapshot, isLoading, error } = useQuery({ queryKey: ['snapshot'], queryFn: getSnapshot });
  const [settings, setSettings] = useState<SettingsType>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  // The transaction scans only depend on account classification, so tweaking
  // assumptions in Settings re-runs just the cheap FIRE arithmetic.
  const base = useMemo(
    () => (snapshot ? deriveBase(snapshot, settings.accountClasses) : null),
    [snapshot, settings.accountClasses],
  );
  const d = useMemo(
    () => (base ? deriveFinance(base, settings.assumptions) : null),
    [base, settings.assumptions],
  );

  const disconnectMut = useMutation({
    mutationFn: disconnect,
    onSuccess: onDisconnect,
  });

  const updateSettings = (next: SettingsType) => {
    setSettings(next);
    saveSettings(next);
  };

  if (isLoading) return <CenterNote>Loading your budget…</CenterNote>;
  if (error || !snapshot || !d)
    return <CenterNote>Could not load the budget snapshot. Try reconnecting.</CenterNote>;

  const cur = snapshot.currency;
  const fmt = (n: number) => formatMoney(n, cur);
  const a = settings.assumptions;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-6">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND, boxShadow: '0 0 10px var(--brand)' }} />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{snapshot.budgetName}</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {snapshot.accounts.length} accounts · {snapshot.transactions.length.toLocaleString()} transactions ·{' '}
            updated {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cur.code && <span className="chip">{cur.code}</span>}
          <button className="btn-ghost" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button className="btn-ghost" onClick={() => disconnectMut.mutate()}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Hero: FIRE + headline numbers */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <Panel className="flex flex-col items-center justify-center rise" style={{ minWidth: 260 }}>
          <Gauge progress={d.fire.progress} label="of FIRE reached" />
          <p className="mt-3 text-center text-xs text-[var(--text-dim)]">
            {fmt(d.netWorth.total)} of {fmt(d.fire.number)}
          </p>
        </Panel>

        <div className="grid gap-6 sm:grid-cols-2">
          <Panel className="rise">
            <Metric
              label="Years to financial independence"
              value={formatYears(d.fire.yearsToFire)}
              sub={<RetirementSub d={d} a={a} fmt={fmt} />}
              tone={d.fire.yearsToFire != null && d.fire.yearsToFire <= 15 ? 'pos' : 'default'}
            />
          </Panel>
          <Panel className="rise">
            <Metric label="Net worth" value={fmt(d.netWorth.total)} sub={`${fmt(d.netWorth.cash)} cash · ${fmt(d.netWorth.investments)} invested`} />
          </Panel>
          <Panel className="rise">
            <Metric
              label="Savings rate (12 mo)"
              value={formatPct(d.savingsRate12)}
              sub={`${fmt(d.monthlyNet)}/mo saved on average`}
              tone={d.savingsRate12 >= 0.2 ? 'pos' : d.savingsRate12 < 0 ? 'neg' : 'default'}
            />
          </Panel>
          <Panel className="rise">
            <Metric label="Monthly burn (12 mo)" value={fmt(d.burn12)} sub={`${fmt(d.monthlyIncome)}/mo income`} />
          </Panel>
        </div>
      </div>

      {/* Net worth + allocation */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Net worth over time" hint="Reconstructed from account balances and history">
          <TrendArea data={d.nwSeries.map((p) => ({ month: p.month, value: p.total }))} currency={cur} height={240} />
        </Panel>
        <Panel title="Where it sits">
          <div className="flex items-center gap-6">
            <Donut
              size={150}
              segments={[
                { label: 'Cash', value: d.netWorth.cash, color: POS },
                { label: 'Investments', value: d.netWorth.investments, color: BRAND },
              ]}
              centerValue={formatPct(d.netWorth.total > 0 ? d.netWorth.investments / d.netWorth.total : 0)}
              centerLabel="invested"
            />
            <div className="space-y-3">
              <Legend color={POS} label="Cash" value={fmt(d.netWorth.cash)} />
              <Legend color={BRAND} label="Investments" value={fmt(d.netWorth.investments)} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Cashflow */}
      <Panel className="mb-6" title="Income, spending & savings" hint="Transfers excluded">
        <CashflowBars data={d.months} currency={cur} height={260} />
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs text-[var(--text-dim)]">
          <span>Burn 3mo: <b className="num text-[var(--text)]">{fmt(d.burn3)}</b></span>
          <span>Burn 6mo: <b className="num text-[var(--text)]">{fmt(d.burn6)}</b></span>
          <span>Burn 12mo: <b className="num text-[var(--text)]">{fmt(d.burn12)}</b></span>
        </div>
      </Panel>

      {/* Layoff survival */}
      <Panel className="mb-6" title="If you lost your income today" hint="How long your assets would cover spending">
        <div className="grid gap-6 sm:grid-cols-3">
          <Metric label="On cash alone" value={formatMonths(d.layoff.cashOnly)} tone="warn" sub={`${fmt(d.netWorth.cash)} cash`} />
          <Metric label="Cash + investments" value={formatMonths(d.layoff.withInvestments)} tone="pos" sub={`${fmt(d.netWorth.total)} total`} />
          <Metric
            label="Emergency fund"
            value={isFinite(d.layoff.emergencyMonths) ? `${d.layoff.emergencyMonths.toFixed(1)} mo` : '∞'}
            sub={d.layoff.emergencyMonths >= 6 ? 'Healthy (6+ months)' : 'Below the 6-month guideline'}
            tone={d.layoff.emergencyMonths >= 6 ? 'pos' : 'warn'}
          />
        </div>
      </Panel>

      {/* FIRE scenarios + what-if */}
      <Panel className="mb-6" title="FIRE projection & what-if" hint="In today's money. Drag the levers.">
        <div className="mb-6 flex flex-wrap gap-3">
          <ScenarioPill label="Lean FIRE" value={fmt(d.fire.targets.lean)} />
          <ScenarioPill label="FIRE" value={fmt(d.fire.targets.base)} highlight />
          <ScenarioPill label="Fat FIRE" value={fmt(d.fire.targets.fat)} />
          <ScenarioPill
            label={d.fire.isCoasting ? 'Coasting ✓' : 'Coast FIRE number'}
            value={fmt(d.fire.coastNumber)}
            tone={d.fire.isCoasting ? 'pos' : undefined}
          />
        </div>
        <WhatIf
          currency={cur}
          netWorth={d.netWorth.total}
          annualContribution={d.annualContribution}
          annualSpend={d.annualSpend}
          withdrawalRate={a.withdrawalRate}
          realReturn={a.realReturn}
          yearsToRetireTarget={d.fire.yearsToRetireTarget}
        />
      </Panel>

      {/* Spending */}
      <h2 className="mb-4 mt-12 text-lg font-semibold text-[var(--text)]">Spending</h2>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Top categories">
          <RankList items={d.spending.byCategory} currency={cur} colorize />
        </Panel>
        <Panel title="Top payees">
          <RankList items={d.spending.byPayee} currency={cur} />
        </Panel>
      </div>

      <Panel className="mb-6" title="Spending by category over time">
        <CategoryTrends rows={d.spending.categoryTrends.rows} keys={d.spending.categoryTrends.keys} currency={cur} height={280} />
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recurring & subscriptions"
          hint="Active subscriptions only — regular payees still charging within the last 12 months"
        >
          {d.spending.recurring.length === 0 ? (
            <p className="text-sm text-[var(--text-faint)]">
              No active recurring payments in the last 12 months.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {d.spending.recurring.slice(0, 8).map((r) => (
                <li key={r.payee} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[var(--text)]">{r.name}</div>
                    <div className="text-xs text-[var(--text-faint)]">every ~{r.cadenceDays}d · {r.occurrences}×</div>
                  </div>
                  <div className="num shrink-0 text-right text-sm">
                    <div className="text-[var(--text)]">{fmt(r.monthly)}/mo</div>
                  </div>
                </li>
              ))}
              <li className="border-t pt-2 text-xs text-[var(--text-dim)]" style={{ borderColor: 'var(--line)' }}>
                Total recurring:{' '}
                <b className="num text-[var(--text)]">
                  {fmt(d.spending.recurring.reduce((s, r) => s + r.monthly, 0))}/mo
                </b>
              </li>
            </ul>
          )}
        </Panel>

        <Panel title="Biggest transactions">
          <ul className="space-y-2">
            {d.spending.biggest.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-[var(--text)]">{t.payeeName}</div>
                  <div className="text-xs text-[var(--text-faint)]">{t.date} · {t.categoryName}</div>
                </div>
                <span className="num shrink-0 text-sm font-medium" style={{ color: NEG }}>{fmt(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Seasonality" hint="Average spend per calendar month">
          <SeasonalityBars data={d.spending.seasonality} currency={cur} />
        </Panel>
        <Panel title="Unusual months" hint="Spend far from your norm">
          {d.spending.anomalies.length === 0 ? (
            <p className="text-sm text-[var(--text-faint)]">No unusual months. Spending is steady.</p>
          ) : (
            <ul className="space-y-2">
              {d.spending.anomalies.map((an) => (
                <li key={an.month} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--text)]">{monthLabel(an.month)}</span>
                  <span className="num text-sm" style={{ color: an.z > 0 ? NEG : POS }}>
                    {fmt(an.total)} ({an.z > 0 ? '+' : ''}{an.z.toFixed(1)}σ)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {showSettings && (
        <Settings
          snapshot={snapshot}
          settings={settings}
          trailing12={d.trailing12}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <div>
        <div className="text-xs text-[var(--text-dim)]">{label}</div>
        <div className="num text-sm font-medium text-[var(--text)]">{value}</div>
      </div>
    </div>
  );
}

function ScenarioPill({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: 'pos' }) {
  return (
    <div
      className="rounded-xl px-3.5 py-2.5"
      style={{
        background: highlight ? 'oklch(62% 0.2 295 / 0.14)' : 'var(--surface-2)',
        border: `1px solid ${highlight ? 'var(--brand)' : 'var(--line)'}`,
      }}
    >
      <div className="label" style={tone === 'pos' ? { color: POS } : undefined}>{label}</div>
      <div className="num mt-1 text-sm font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function RetirementSub({ d, a, fmt }: { d: Derived; a: Assumptions; fmt: (n: number) => string }) {
  const yf = d.fire.yearsToFire;
  if (yf == null) return <>Increase savings or lower target spend to reach independence</>;
  const fiAge = a.currentAge != null ? Math.round(a.currentAge + yf) : null;
  return (
    <>
      at {fmt(d.annualContribution)}/yr saved{fiAge != null ? ` · independent at age ${fiAge}` : ''}
      {fiAge != null && (
        <span className="mt-0.5 block" style={{ color: fiAge <= a.retireAge ? POS : NEG }}>
          {fiAge <= a.retireAge
            ? `${a.retireAge - fiAge} yr ahead of your target age (${a.retireAge})`
            : `${fiAge - a.retireAge} yr past your target age (${a.retireAge})`}
        </span>
      )}
    </>
  );
}

function CenterNote({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center text-sm text-[var(--text-dim)]">{children}</div>;
}
