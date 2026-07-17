import { describe, it, expect } from 'vitest';
import { derive } from './derive';
import { loadSettings } from '../lib/settings';
import type { Snapshot, TransactionDTO } from '../types';

// Build a realistic ~24-month synthetic budget.
function build(): Snapshot {
  const txs: TransactionDTO[] = [];
  let n = 0;
  const add = (date: string, amount: number, category: string | null, payee: string | null) =>
    txs.push({
      id: `t${n++}`,
      account: 'chk',
      date,
      amount,
      payee,
      category,
      transfer_id: null,
      is_parent: false,
      is_child: false,
    });

  for (let i = 0; i < 24; i++) {
    const ym = `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    add(`${ym}-25`, 500000, 'inc', 'employer'); // €5,000 salary
    add(`${ym}-01`, -150000, 'rent', 'landlord'); // €1,500 rent
    add(`${ym}-10`, -40000, 'food', 'grocer'); // €400 food
    add(`${ym}-05`, -999, 'fun', 'netflix'); // €9.99 subscription
  }

  return {
    budgetName: 'Synthetic',
    currency: { code: 'EUR', symbol: '€', symbolFirst: true },
    transactions: txs,
    accounts: [
      { id: 'chk', name: 'Checking', offbudget: false, closed: false, balance: 2000000 },
      { id: 'brk', name: 'Brokerage', offbudget: true, closed: false, balance: 15000000 },
    ],
    categories: [
      { id: 'inc', name: 'Salary', group_id: 'gi', is_income: true },
      { id: 'rent', name: 'Rent', group_id: 'g', is_income: false },
      { id: 'food', name: 'Food', group_id: 'g', is_income: false },
      { id: 'fun', name: 'Fun', group_id: 'g', is_income: false },
    ],
    categoryGroups: [
      { id: 'gi', name: 'Income', is_income: true },
      { id: 'g', name: 'Spending', is_income: false },
    ],
    payees: [
      { id: 'employer', name: 'Employer', transfer_acct: null },
      { id: 'landlord', name: 'Landlord', transfer_acct: null },
      { id: 'grocer', name: 'Grocer', transfer_acct: null },
      { id: 'netflix', name: 'Netflix', transfer_acct: null },
    ],
    generatedAt: '2026-01-15T00:00:00Z',
  };
}

describe('derive (integration)', () => {
  const snap = build();
  const settings = loadSettings();
  const d = derive(snap, settings);

  it('computes net worth split correctly', () => {
    expect(d.netWorth.cash).toBe(2000000);
    expect(d.netWorth.investments).toBe(15000000);
    expect(d.netWorth.total).toBe(17000000);
  });

  it('derives spend, income and a positive savings rate', () => {
    // monthly expense ~ 1500+400+9.99 = 1909.99 => 190999 minor
    expect(d.monthlyExpense).toBeGreaterThan(185000);
    expect(d.monthlyExpense).toBeLessThan(195000);
    expect(d.monthlyIncome).toBe(500000);
    expect(d.savingsRate12).toBeGreaterThan(0.5);
  });

  it('produces FIRE number and a finite projection', () => {
    expect(d.fire.number).toBeGreaterThan(0);
    expect(d.fire.projection.length).toBeGreaterThan(1);
    expect(d.fire.targets.fat).toBeGreaterThan(d.fire.targets.base);
  });

  it('finds top categories and the recurring subscription', () => {
    expect(d.spending.byCategory[0].name).toBe('Rent');
    const names = d.spending.recurring.map((r) => r.name);
    expect(names).toContain('Netflix');
  });

  it('computes finite layoff runways', () => {
    expect(d.layoff.cashOnly).toBeGreaterThan(0);
    expect(d.layoff.withInvestments).toBeGreaterThan(d.layoff.cashOnly);
    expect(isFinite(d.layoff.emergencyMonths)).toBe(true);
  });

  it('builds a non-empty net worth series and monthly cashflow', () => {
    expect(d.nwSeries.length).toBeGreaterThan(0);
    expect(d.months.length).toBe(24);
  });
});
