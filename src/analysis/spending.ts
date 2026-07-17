import type { Snapshot, TransactionDTO } from '../types';
import { monthKey, monthsBetween, monthOfYear } from '../lib/date';
import {
  buildIndexes,
  realTransactions,
  isIncome,
  categoryName,
  payeeName,
  type Indexes,
} from './_shared';

export interface Ranked {
  id: string;
  name: string;
  total: number; // positive minor units spent
  count: number;
}

/** Expense transactions only (real, non-income), as positive-magnitude rows. */
function expenseTxs(snap: Snapshot, idx: Indexes): TransactionDTO[] {
  return realTransactions(snap, idx).filter((tx) => !isIncome(tx, idx) && tx.amount < 0);
}

export function byCategory(snap: Snapshot, idx: Indexes = buildIndexes(snap)): Ranked[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const tx of expenseTxs(snap, idx)) {
    const key = tx.category ?? 'uncategorized';
    const cur = totals.get(key) ?? { total: 0, count: 0 };
    cur.total += -tx.amount;
    cur.count += 1;
    totals.set(key, cur);
  }
  return [...totals.entries()]
    .map(([id, v]) => ({ id, name: categoryName(id, idx), total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export function byPayee(snap: Snapshot, idx: Indexes = buildIndexes(snap)): Ranked[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const tx of expenseTxs(snap, idx)) {
    const key = tx.payee ?? 'unknown';
    const cur = totals.get(key) ?? { total: 0, count: 0 };
    cur.total += -tx.amount;
    cur.count += 1;
    totals.set(key, cur);
  }
  return [...totals.entries()]
    .map(([id, v]) => ({ id, name: payeeName(id, idx), total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthTotal {
  month: string;
  total: number;
}

export function monthlyTotals(snap: Snapshot, idx: Indexes = buildIndexes(snap)): MonthTotal[] {
  const txs = expenseTxs(snap, idx);
  if (txs.length === 0) return [];
  const map = new Map<string, number>();
  let min = '9999-99';
  let max = '0000-00';
  for (const tx of txs) {
    const m = monthKey(tx.date);
    if (m < min) min = m;
    if (m > max) max = m;
    map.set(m, (map.get(m) ?? 0) + -tx.amount);
  }
  return monthsBetween(min, max).map((month) => ({ month, total: map.get(month) ?? 0 }));
}

/** Spend per top-N category over time, as stacked rows keyed by category name.
 *  Pass `ranked` (from byCategory) when already computed to avoid a re-scan. */
export function categoryTrends(
  snap: Snapshot,
  topN = 6,
  idx: Indexes = buildIndexes(snap),
  ranked: Ranked[] = byCategory(snap, idx),
): { rows: Record<string, number | string>[]; keys: string[] } {
  const top = ranked.slice(0, topN);
  const topIds = new Set(top.map((c) => c.id));
  const keys = top.map((c) => c.name);

  const txs = expenseTxs(snap, idx);
  if (txs.length === 0) return { rows: [], keys };
  let min = '9999-99';
  let max = '0000-00';
  for (const tx of txs) {
    const m = monthKey(tx.date);
    if (m < min) min = m;
    if (m > max) max = m;
  }
  const months = monthsBetween(min, max);
  const byMonth = new Map<string, Record<string, number>>();
  for (const m of months) byMonth.set(m, {});

  for (const tx of txs) {
    const id = tx.category ?? 'uncategorized';
    if (!topIds.has(id)) continue;
    const m = monthKey(tx.date);
    const bucket = byMonth.get(m)!;
    const name = categoryName(id, idx);
    bucket[name] = (bucket[name] ?? 0) + -tx.amount;
  }

  const rows = months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const k of keys) row[k] = byMonth.get(month)![k] ?? 0;
    return row;
  });
  return { rows, keys };
}

export function biggestTransactions(
  snap: Snapshot,
  topN = 10,
  idx: Indexes = buildIndexes(snap),
): (TransactionDTO & { payeeName: string; categoryName: string })[] {
  return expenseTxs(snap, idx)
    .slice()
    .sort((a, b) => a.amount - b.amount) // most negative first
    .slice(0, topN)
    .map((tx) => ({
      ...tx,
      payeeName: tx.payee ? idx.payeeById.get(tx.payee)?.name ?? '—' : '—',
      categoryName: tx.category ? idx.categoryById.get(tx.category)?.name ?? '—' : '—',
    }));
}

export interface Recurring {
  payee: string;
  name: string;
  cadenceDays: number;
  avgAmount: number; // positive minor units
  occurrences: number;
  monthly: number; // normalized monthly cost
  lastDate: string; // YYYY-MM-DD of the most recent charge
}

/** A subscription counts as "active" if it charged within this many days of the
 *  latest activity in the budget. Keeps the list to things you still pay for. */
const RECURRING_ACTIVE_WINDOW_DAYS = 365;

/**
 * Detect recurring/subscription payees: >=3 outflows at a roughly regular
 * cadence. Only *active* subscriptions are returned — those whose most recent
 * charge falls within the last 12 months of the budget's activity — so
 * long-cancelled subscriptions don't linger in the list.
 */
export function recurring(snap: Snapshot, idx: Indexes = buildIndexes(snap)): Recurring[] {
  const byPayeeId = new Map<string, TransactionDTO[]>();
  let maxDate = '';
  for (const tx of expenseTxs(snap, idx)) {
    if (tx.date > maxDate) maxDate = tx.date;
    if (!tx.payee) continue;
    const arr = byPayeeId.get(tx.payee) ?? [];
    arr.push(tx);
    byPayeeId.set(tx.payee, arr);
  }
  const referenceMs = maxDate ? Date.parse(maxDate) : 0;

  const out: Recurring[] = [];
  for (const [payee, txsRaw] of byPayeeId) {
    if (txsRaw.length < 3) continue;
    const txs = txsRaw.slice().sort((a, b) => a.date.localeCompare(b.date));
    const days = txs.map((t) => Date.parse(t.date));
    const gaps: number[] = [];
    for (let i = 1; i < days.length; i++) gaps.push((days[i] - days[i - 1]) / 86_400_000);
    const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (meanGap < 20 || meanGap > 400) continue; // not weekly..yearly cadence
    const variance = gaps.reduce((s, g) => s + (g - meanGap) ** 2, 0) / gaps.length;
    const cv = Math.sqrt(variance) / meanGap;
    if (cv > 0.5) continue; // too irregular

    const lastDate = txs[txs.length - 1].date;
    // Drop subscriptions that stopped charging long ago — only keep active ones.
    if (referenceMs && (referenceMs - Date.parse(lastDate)) / 86_400_000 > RECURRING_ACTIVE_WINDOW_DAYS)
      continue;

    const amounts = txs.map((t) => -t.amount);
    const avg = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length);
    const monthly = Math.round(avg * (30.44 / meanGap));
    out.push({
      payee,
      name: idx.payeeById.get(payee)?.name ?? payee,
      cadenceDays: Math.round(meanGap),
      avgAmount: avg,
      occurrences: txs.length,
      monthly,
      lastDate,
    });
  }
  return out.sort((a, b) => b.monthly - a.monthly);
}

export interface Anomaly {
  month: string;
  total: number;
  mean: number;
  z: number;
}

/** Months whose total spend deviates > 2 standard deviations from the mean. */
export function anomalies(totals: MonthTotal[]): Anomaly[] {
  if (totals.length < 3) return [];
  const vals = totals.map((t) => t.total);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return [];
  return totals
    .map((t) => ({ month: t.month, total: t.total, mean: Math.round(mean), z: (t.total - mean) / sd }))
    .filter((a) => Math.abs(a.z) > 2);
}

export interface SeasonPoint {
  monthOfYear: number; // 1-12
  avg: number;
}

/** Average spend per calendar month (1-12). */
export function seasonality(totals: MonthTotal[]): SeasonPoint[] {
  const sums = new Array(13).fill(0);
  const counts = new Array(13).fill(0);
  for (const t of totals) {
    const moy = monthOfYear(t.month);
    sums[moy] += t.total;
    counts[moy] += 1;
  }
  const out: SeasonPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ monthOfYear: m, avg: counts[m] ? Math.round(sums[m] / counts[m]) : 0 });
  }
  return out;
}
