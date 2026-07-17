import { describe, it, expect } from 'vitest';
import {
  monthlyCashflow,
  savingsRate,
  burnRate,
  trailing12Expense,
} from './cashflow';
import type { Snapshot, TransactionDTO } from '../types';

const base: Omit<Snapshot, 'transactions'> = {
  budgetName: 'Test',
  currency: { code: 'EUR', symbol: '€', symbolFirst: true },
  accounts: [{ id: 'a', name: 'Check', offbudget: false, closed: false, balance: 0 }],
  categories: [
    { id: 'inc', name: 'Salary', group_id: 'g', is_income: true },
    { id: 'food', name: 'Food', group_id: 'g2', is_income: false },
  ],
  categoryGroups: [],
  payees: [{ id: 'pt', name: 'Transfer', transfer_acct: 'b' }],
  generatedAt: '2026-02-01T00:00:00Z',
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

describe('cashflow', () => {
  it('computes monthly income, expense, net excluding transfers', () => {
    const s = snap([
      tx({ amount: 300000, category: 'inc' }),
      tx({ amount: -50000, category: 'food' }),
      tx({ amount: -99999, transfer_id: 't-x' }), // transfer leg, excluded
      tx({ amount: -77777, payee: 'pt' }), // transfer payee, excluded
    ]);
    const m = monthlyCashflow(s).find((x) => x.month === '2026-01')!;
    expect(m.income).toBe(300000);
    expect(m.expense).toBe(50000);
    expect(m.net).toBe(250000);
  });

  it('counts split children, not the parent', () => {
    const s = snap([
      tx({ id: 'p', amount: -10000, is_parent: true, category: null }),
      tx({ id: 'c1', amount: -6000, is_child: true, category: 'food' }),
      tx({ id: 'c2', amount: -4000, is_child: true, category: 'food' }),
    ]);
    const m = monthlyCashflow(s).find((x) => x.month === '2026-01')!;
    expect(m.expense).toBe(10000); // children only, parent skipped
  });

  it('treats uncategorised inflow as income', () => {
    const s = snap([tx({ amount: 12345, category: null })]);
    const m = monthlyCashflow(s).find((x) => x.month === '2026-01')!;
    expect(m.income).toBe(12345);
    expect(m.expense).toBe(0);
  });

  it('fills gap months between first and last transaction', () => {
    const s = snap([
      tx({ date: '2026-01-05', amount: -1000, category: 'food' }),
      tx({ date: '2026-03-05', amount: -2000, category: 'food' }),
    ]);
    const months = monthlyCashflow(s).map((m) => m.month);
    expect(months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('savings rate handles zero income', () => {
    expect(savingsRate([{ month: 'x', income: 1000, expense: 600, net: 400 }])).toBeCloseTo(0.4);
    expect(savingsRate([{ month: 'x', income: 0, expense: 100, net: -100 }])).toBe(0);
  });

  it('burn rate averages last window months', () => {
    const months = [
      { month: '1', income: 0, expense: 100, net: -100 },
      { month: '2', income: 0, expense: 300, net: -300 },
      { month: '3', income: 0, expense: 200, net: -200 },
    ];
    expect(burnRate(months, 2)).toBe(250);
  });

  it('trailing 12 month expense sums recent months', () => {
    // 13 distinct months: 2025-01 .. 2026-01, each -1000 spend.
    const clean: TransactionDTO[] = [];
    for (let i = 0; i < 13; i++) {
      const ym = `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
      clean.push(tx({ date: `${ym}-10`, amount: -1000, category: 'food' }));
    }
    const s = snap(clean);
    // trailing 12 of 13 months => 12000
    expect(trailing12Expense(monthlyCashflow(s))).toBe(12000);
  });
});
