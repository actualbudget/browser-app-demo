import type { Snapshot, AccountClass } from '../types';
import { resolveClass } from '../lib/classify';
import { monthKey, monthsBetween } from '../lib/date';

export interface NetWorthBreakdown {
  cash: number;
  investments: number;
  total: number;
}

type Classes = Record<string, AccountClass>;

/** Current net worth split by account class (excludes 'excluded' accounts). */
export function currentNetWorth(snap: Snapshot, classes: Classes): NetWorthBreakdown {
  let cash = 0;
  let investments = 0;
  for (const acc of snap.accounts) {
    const cls = resolveClass(acc, classes);
    if (cls === 'cash') cash += acc.balance;
    else if (cls === 'investment') investments += acc.balance;
  }
  return { cash, investments, total: cash + investments };
}

export interface NetWorthPoint {
  month: string;
  total: number;
}

/**
 * Reconstruct month-end net worth by walking transactions backwards from
 * current balances. End-of-month M balance = current balance − sum of all
 * transactions dated after month M. Excludes 'excluded' accounts.
 */
export function netWorthSeries(snap: Snapshot, classes: Classes): NetWorthPoint[] {
  const included = snap.accounts.filter((a) => resolveClass(a, classes) !== 'excluded');
  if (included.length === 0) return [];
  const includedIds = new Set(included.map((a) => a.id));

  // Determine month range from transactions affecting included accounts.
  let min = '9999-99';
  let max = monthKey(snap.generatedAt.slice(0, 10));
  for (const tx of snap.transactions) {
    if (!includedIds.has(tx.account)) continue;
    const m = monthKey(tx.date);
    if (m < min) min = m;
    if (m > max) max = m;
  }
  if (min === '9999-99') {
    // No transactions: single point at current total.
    const total = included.reduce((s, a) => s + a.balance, 0);
    return [{ month: max, total }];
  }

  const months = monthsBetween(min, max);

  // Pre-bucket included-account transaction deltas per month.
  const deltaByMonth = new Map<string, number>();
  for (const tx of snap.transactions) {
    if (!includedIds.has(tx.account)) continue;
    if (tx.is_parent) continue; // parent + children would double count
    const m = monthKey(tx.date);
    deltaByMonth.set(m, (deltaByMonth.get(m) ?? 0) + tx.amount);
  }

  const currentTotal = included.reduce((s, a) => s + a.balance, 0);

  // Walk from the latest month backwards.
  const points: NetWorthPoint[] = [];
  let running = currentTotal;
  for (let i = months.length - 1; i >= 0; i--) {
    const month = months[i];
    points.push({ month, total: running });
    // Step to the previous month-end by removing this month's deltas.
    running -= deltaByMonth.get(month) ?? 0;
  }
  points.reverse();
  return points;
}
