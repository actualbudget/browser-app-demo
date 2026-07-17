import type { Snapshot } from '../types';
import { monthKey, monthsBetween } from '../lib/date';
import { buildIndexes, realTransactions, isIncome, type Indexes } from './_shared';

export interface MonthFlow {
  month: string; // 'YYYY-MM'
  income: number; // minor units, positive
  expense: number; // minor units, positive
  net: number; // income - expense
}

/** Income / expense / net per calendar month, transfers excluded. */
export function monthlyCashflow(snap: Snapshot, idx: Indexes = buildIndexes(snap)): MonthFlow[] {
  const txs = realTransactions(snap, idx);
  if (txs.length === 0) return [];

  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  let min = '9999-99';
  let max = '0000-00';

  for (const tx of txs) {
    const m = monthKey(tx.date);
    if (m < min) min = m;
    if (m > max) max = m;
    if (isIncome(tx, idx)) {
      income.set(m, (income.get(m) ?? 0) + tx.amount);
    } else {
      // expense-bucket amounts are typically negative; accumulate then negate
      expense.set(m, (expense.get(m) ?? 0) + tx.amount);
    }
  }

  return monthsBetween(min, max).map((month) => {
    const inc = income.get(month) ?? 0;
    const exp = -(expense.get(month) ?? 0) + 0; // flip sign to positive spend (+0 normalises -0)
    return { month, income: inc, expense: exp, net: inc - exp };
  });
}

/** Aggregate savings rate over the given months: (income - expense) / income. */
export function savingsRate(months: MonthFlow[]): number {
  const income = months.reduce((s, m) => s + m.income, 0);
  const expense = months.reduce((s, m) => s + m.expense, 0);
  if (income <= 0) return 0;
  return (income - expense) / income;
}

/** Average monthly expense over the last `window` months of the series. */
export function burnRate(months: MonthFlow[], window: number): number {
  if (months.length === 0) return 0;
  const slice = months.slice(-window);
  const total = slice.reduce((s, m) => s + m.expense, 0);
  return Math.round(total / slice.length);
}

/** Total expense over the last 12 months of the series (positive). */
export function trailing12Expense(months: MonthFlow[]): number {
  return months.slice(-12).reduce((s, m) => s + m.expense, 0);
}

/** Average monthly income across the last `window` months. */
export function avgMonthlyIncome(months: MonthFlow[], window = 12): number {
  if (months.length === 0) return 0;
  const slice = months.slice(-window);
  return Math.round(slice.reduce((s, m) => s + m.income, 0) / slice.length);
}

/** Average monthly net (savings) across the last `window` months. */
export function avgMonthlyNet(months: MonthFlow[], window = 12): number {
  if (months.length === 0) return 0;
  const slice = months.slice(-window);
  return Math.round(slice.reduce((s, m) => s + m.net, 0) / slice.length);
}
