import { describe, it, expect } from 'vitest';
import { currentNetWorth, netWorthSeries } from './networth';
import type { Snapshot, TransactionDTO } from '../types';

const base: Omit<Snapshot, 'transactions' | 'accounts'> = {
  budgetName: 'T',
  currency: { code: 'EUR', symbol: '€', symbolFirst: true },
  categories: [],
  categoryGroups: [],
  payees: [],
  generatedAt: '2026-03-15T00:00:00Z',
};

let n = 0;
const tx = (p: Partial<TransactionDTO>): TransactionDTO => ({
  id: `t${n++}`,
  account: 'cash',
  date: '2026-03-10',
  amount: 0,
  payee: null,
  category: null,
  transfer_id: null,
  is_parent: false,
  is_child: false,
  ...p,
});

describe('networth', () => {
  it('splits current net worth by class and excludes excluded accounts', () => {
    const snap: Snapshot = {
      ...base,
      accounts: [
        { id: 'cash', name: 'Checking', offbudget: false, closed: false, balance: 100000 },
        { id: 'inv', name: 'Brokerage', offbudget: true, closed: false, balance: 500000 },
        { id: 'old', name: 'Closed', offbudget: false, closed: true, balance: 9999 },
      ],
      transactions: [],
    };
    const nw = currentNetWorth(snap, {});
    expect(nw.cash).toBe(100000);
    expect(nw.investments).toBe(500000);
    expect(nw.total).toBe(600000);
  });

  it('reconstructs month-end balances backwards from current', () => {
    const snap: Snapshot = {
      ...base,
      accounts: [{ id: 'cash', name: 'Checking', offbudget: false, closed: false, balance: 100000 }],
      transactions: [
        tx({ date: '2026-02-10', amount: -30000 }),
        tx({ date: '2026-03-10', amount: 50000 }),
      ],
    };
    const series = netWorthSeries(snap, {});
    expect(series).toEqual([
      { month: '2026-02', total: 50000 },
      { month: '2026-03', total: 100000 },
    ]);
  });

  it('returns single point when there are no transactions', () => {
    const snap: Snapshot = {
      ...base,
      accounts: [{ id: 'cash', name: 'C', offbudget: false, closed: false, balance: 4200 }],
      transactions: [],
    };
    expect(netWorthSeries(snap, {})).toEqual([{ month: '2026-03', total: 4200 }]);
  });
});
