import type { Snapshot, Settings, Assumptions, AccountClass } from '../types';
import { resolveClass } from '../lib/classify';
import {
  buildIndexes,
  monthlyCashflow,
  savingsRate,
  burnRate,
  trailing12Expense,
  avgMonthlyIncome,
  avgMonthlyNet,
  currentNetWorth,
  netWorthSeries,
  byCategory,
  byPayee,
  monthlyTotals,
  categoryTrends,
  recurring,
  biggestTransactions,
  anomalies,
  seasonality,
  fireNumber,
  fireProgress,
  leanFatTargets,
  projection,
  coastFireNumber,
  isCoasting,
  yearsToRetirement,
  runwayMonths,
} from '../analysis';

export type DerivedBase = ReturnType<typeof deriveBase>;
export type Derived = ReturnType<typeof deriveFinance>;

/**
 * Everything derived from the snapshot + account classification. This is the
 * expensive part (full transaction scans), so it's separated from the cheap
 * assumption arithmetic and memoized independently in the Dashboard.
 */
export function deriveBase(snapshot: Snapshot, classes: Record<string, AccountClass>) {
  // Spending/income flows through cash-classified accounts only, so changing an
  // account's class (cash / investment / excluded) live-updates these analyses.
  const cashAccounts = new Set(
    snapshot.accounts.filter((acc) => resolveClass(acc, classes) === 'cash').map((acc) => acc.id),
  );
  const idx = buildIndexes(snapshot, cashAccounts);

  const months = monthlyCashflow(snapshot, idx);
  const totals = monthlyTotals(snapshot, idx);
  const rankedCategories = byCategory(snapshot, idx);
  const trailing12 = trailing12Expense(months);

  return {
    idx,
    months,
    netWorth: currentNetWorth(snapshot, classes),
    nwSeries: netWorthSeries(snapshot, classes),

    trailing12,
    monthlyExpense: burnRate(months, 12) || Math.round(trailing12 / 12),
    monthlyIncome: avgMonthlyIncome(months, 12),
    monthlyNet: avgMonthlyNet(months, 12),
    savingsRate12: savingsRate(months.slice(-12)),
    burn3: burnRate(months, 3),
    burn6: burnRate(months, 6),
    burn12: burnRate(months, 12),

    spending: {
      byCategory: rankedCategories,
      byPayee: byPayee(snapshot, idx),
      monthlyTotals: totals,
      categoryTrends: categoryTrends(snapshot, 6, idx, rankedCategories),
      recurring: recurring(snapshot, idx),
      biggest: biggestTransactions(snapshot, 8, idx),
      anomalies: anomalies(totals),
      seasonality: seasonality(totals),
    },
  };
}

/** Layer the cheap FIRE/runway arithmetic on top of a derived base. */
export function deriveFinance(base: DerivedBase, a: Assumptions) {
  const { netWorth, trailing12, monthlyExpense, monthlyNet } = base;
  const annualSpend = a.targetAnnualSpend ?? trailing12;
  const annualContribution = Math.max(0, monthlyNet * 12);

  const projParams = {
    netWorth: netWorth.total,
    annualContribution,
    annualSpend,
    withdrawalRate: a.withdrawalRate,
    realReturn: a.realReturn,
  };

  const yearsToRetireTarget =
    a.currentAge != null ? Math.max(0, a.retireAge - a.currentAge) : 25;
  const cashOnly = runwayMonths(netWorth.cash, monthlyExpense);

  return {
    ...base,
    annualSpend,
    annualContribution,

    fire: {
      number: fireNumber(annualSpend, a.withdrawalRate),
      progress: fireProgress(netWorth.total, annualSpend, a.withdrawalRate),
      projection: projection(projParams),
      yearsToFire: yearsToRetirement(projParams),
      targets: leanFatTargets(annualSpend, a.withdrawalRate),
      coastNumber: coastFireNumber(annualSpend, a.withdrawalRate, a.realReturn, yearsToRetireTarget),
      isCoasting: isCoasting(netWorth.total, annualSpend, a.withdrawalRate, a.realReturn, yearsToRetireTarget),
      yearsToRetireTarget,
    },

    layoff: {
      cashOnly,
      withInvestments: runwayMonths(netWorth.cash + netWorth.investments, monthlyExpense),
      emergencyMonths: cashOnly,
    },
  };
}

/** Run every analysis once for the current snapshot + settings. */
export function derive(snapshot: Snapshot, settings: Settings): Derived {
  return deriveFinance(deriveBase(snapshot, settings.accountClasses), settings.assumptions);
}
