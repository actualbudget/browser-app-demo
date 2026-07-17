import { describe, it, expect } from 'vitest';
import {
  byCategory,
  byPayee,
  biggestTransactions,
  recurring,
  monthlyTotals,
  anomalies,
  seasonality,
} from './spending';
import type { Snapshot, TransactionDTO } from '../types';

const base: Omit<Snapshot, 'transactions'> = {
  budgetName: 'T',
  currency: { code: 'EUR', symbol: '€', symbolFirst: true },
  accounts: [{ id: 'a', name: 'Check', offbudget: false, closed: false, balance: 0 }],
  categories: [
    { id: 'food', name: 'Food', group_id: 'g', is_income: false },
    { id: 'rent', name: 'Rent', group_id: 'g', is_income: false },
    { id: 'inc', name: 'Salary', group_id: 'g2', is_income: true },
  ],
  categoryGroups: [],
  payees: [
    { id: 'net', name: 'Netflix', transfer_acct: null },
    { id: 'shop', name: 'Shop', transfer_acct: null },
  ],
  generatedAt: '2026-04-01T00:00:00Z',
};

let n = 0;
const tx = (p: Partial<TransactionDTO>): TransactionDTO => ({
  id: `t${n++}`,
  account: 'a',
  date: '2026-01-10',
  amount: 0,
  payee: null,
  category: null,
  transfer_id: null,
  is_parent: false,
  is_child: false,
  ...p,
});

const snap = (transactions: TransactionDTO[]): Snapshot => ({ ...base, transactions });

describe('spending', () => {
  it('aggregates and sorts by category, ignoring income', () => {
    const s = snap([
      tx({ amount: -3000, category: 'food' }),
      tx({ amount: -2000, category: 'food' }),
      tx({ amount: -9000, category: 'rent' }),
      tx({ amount: 500000, category: 'inc' }), // income ignored
    ]);
    const cats = byCategory(s);
    expect(cats[0]).toMatchObject({ name: 'Rent', total: 9000, count: 1 });
    expect(cats[1]).toMatchObject({ name: 'Food', total: 5000, count: 2 });
  });

  it('excludes transfers from category spending (not "Uncategorized")', () => {
    const s = snap([
      tx({ amount: -2000, category: 'food' }),
      tx({ amount: -50000, category: null, transfer_id: 'leg-2' }), // transfer leg, no category
      tx({ amount: -75000, category: null, payee: 'xfer' }), // transfer-payee, no category
    ]);
    // give the snapshot a transfer payee
    s.payees = [...s.payees, { id: 'xfer', name: 'Transfer: Savings', transfer_acct: 'sav' }];
    const cats = byCategory(s);
    expect(cats.map((c) => c.name)).not.toContain('Uncategorized');
    expect(cats).toHaveLength(1);
    expect(cats[0]).toMatchObject({ name: 'Food', total: 2000 });
  });

  it('excludes off-budget (investment) account activity from spending', () => {
    const s = snap([
      tx({ amount: -2000, category: 'food', account: 'a' }), // on-budget
      tx({ amount: -900000, category: null, account: 'brk' }), // brokerage churn, off-budget
    ]);
    s.accounts = [
      { id: 'a', name: 'Check', offbudget: false, closed: false, balance: 0 },
      { id: 'brk', name: 'Brokerage', offbudget: true, closed: false, balance: 0 },
    ];
    const cats = byCategory(s);
    expect(cats).toHaveLength(1);
    expect(cats[0]).toMatchObject({ name: 'Food', total: 2000 });
    expect(cats.map((c) => c.name)).not.toContain('Uncategorized');
  });

  it('keeps genuinely uncategorized non-transfer spend', () => {
    const s = snap([
      tx({ amount: -3000, category: null }), // real uncategorized outflow
      tx({ amount: -1000, category: 'food' }),
    ]);
    const cats = byCategory(s);
    expect(cats.map((c) => c.name)).toContain('Uncategorized');
  });

  it('aggregates by payee', () => {
    const s = snap([
      tx({ amount: -1000, payee: 'net' }),
      tx({ amount: -1000, payee: 'net' }),
      tx({ amount: -5000, payee: 'shop' }),
    ]);
    const p = byPayee(s);
    expect(p[0]).toMatchObject({ name: 'Shop', total: 5000 });
    expect(p[1]).toMatchObject({ name: 'Netflix', total: 2000 });
  });

  it('returns biggest outflows first', () => {
    const s = snap([
      tx({ amount: -1000, category: 'food' }),
      tx({ amount: -9000, category: 'rent' }),
      tx({ amount: -3000, category: 'food' }),
    ]);
    const big = biggestTransactions(s, 2);
    expect(big.map((b) => b.amount)).toEqual([-9000, -3000]);
    expect(big[0].categoryName).toBe('Rent');
  });

  it('detects monthly recurring subscriptions', () => {
    const s = snap([
      tx({ date: '2026-01-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-02-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-03-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-04-05', amount: -999, payee: 'net' }),
    ]);
    const r = recurring(s);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Netflix');
    expect(r[0].cadenceDays).toBeGreaterThanOrEqual(28);
    expect(r[0].cadenceDays).toBeLessThanOrEqual(31);
    expect(r[0].avgAmount).toBe(999);
  });

  it('does not flag irregular payees as recurring', () => {
    const s = snap([
      tx({ date: '2026-01-05', amount: -100, payee: 'shop' }),
      tx({ date: '2026-01-06', amount: -5000, payee: 'shop' }),
    ]);
    expect(recurring(s)).toHaveLength(0);
  });

  it('omits recurring payees that stopped more than 12 months ago', () => {
    const s = snap([
      // active subscription: charges right up to the end of the data
      tx({ date: '2025-12-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-01-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-02-05', amount: -999, payee: 'net' }),
      tx({ date: '2026-03-05', amount: -999, payee: 'net' }),
      // old/cancelled subscription that ended back in 2023
      tx({ date: '2023-01-10', amount: -500, payee: 'shop' }),
      tx({ date: '2023-02-10', amount: -500, payee: 'shop' }),
      tx({ date: '2023-03-10', amount: -500, payee: 'shop' }),
      tx({ date: '2023-04-10', amount: -500, payee: 'shop' }),
    ]);
    const r = recurring(s);
    expect(r.map((x) => x.name)).toEqual(['Netflix']);
    expect(r[0].lastDate).toBe('2026-03-05');
  });

  it('reports no anomalies for steady spend', () => {
    const s = snap([
      tx({ date: '2026-01-10', amount: -1000, category: 'food' }),
      tx({ date: '2026-02-10', amount: -1000, category: 'food' }),
      tx({ date: '2026-03-10', amount: -1000, category: 'food' }),
    ]);
    expect(anomalies(monthlyTotals(s))).toHaveLength(0);
  });

  it('flat seasonality for equal monthly spend', () => {
    const s = snap([
      tx({ date: '2026-01-10', amount: -1000, category: 'food' }),
      tx({ date: '2026-02-10', amount: -1000, category: 'food' }),
    ]);
    const season = seasonality(monthlyTotals(s));
    expect(season).toHaveLength(12);
    expect(season[0]).toEqual({ monthOfYear: 1, avg: 1000 });
    expect(season[2]).toEqual({ monthOfYear: 3, avg: 0 });
  });
});
