import { describe, it, expect } from 'vitest';
import { buildDemoSnapshot } from './demo';
import { recurring } from '../analysis/spending';
import { monthlyCashflow, savingsRate } from '../analysis/cashflow';
import { autoClassify } from '../lib/classify';
import { currentNetWorth } from '../analysis/networth';
import { today } from '../lib/date';

describe('buildDemoSnapshot', () => {
  const snap = buildDemoSnapshot();

  it('produces a structurally valid snapshot', () => {
    expect(snap.budgetName).toBe('Demo Budget');
    expect(snap.currency.code).toBe('USD');
    expect(snap.accounts.length).toBeGreaterThanOrEqual(4);
    expect(snap.transactions.length).toBeGreaterThan(500);
    expect(snap.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes an off-budget investment account', () => {
    const brokerage = snap.accounts.find((a) => a.offbudget);
    expect(brokerage).toBeDefined();
    expect(autoClassify(brokerage!)).toBe('investment');
  });

  it('has income and expense categories', () => {
    expect(snap.categories.some((c) => c.is_income)).toBe(true);
    expect(snap.categories.some((c) => !c.is_income)).toBe(true);
    expect(snap.categoryGroups.some((g) => g.is_income)).toBe(true);
  });

  it('includes transfer payees', () => {
    expect(snap.payees.filter((p) => p.transfer_acct != null).length).toBeGreaterThanOrEqual(2);
  });

  it('spans roughly three years of history up to today', () => {
    const dates = snap.transactions.map((t) => t.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    const months =
      (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 +
      (Number(last.slice(5, 7)) - Number(first.slice(5, 7)));
    expect(months).toBeGreaterThanOrEqual(33);
    expect(last <= today()).toBe(true);
  });

  it('account balances equal the sum of their leaf transactions', () => {
    for (const acc of snap.accounts) {
      const sum = snap.transactions
        .filter((t) => t.account === acc.id && !t.is_parent)
        .reduce((s, t) => s + t.amount, 0);
      expect(acc.balance).toBe(sum);
    }
  });

  it('produces analysis output: multiple active recurring subscriptions', () => {
    const subs = recurring(snap);
    expect(subs.length).toBeGreaterThanOrEqual(2);
    // Netflix, Spotify and the gym charge monthly right up to the present.
    const names = subs.map((s) => s.name);
    expect(names).toContain('Netflix');
    expect(names).toContain('Spotify');
  });

  it('has a healthy, positive savings rate and growing net worth', () => {
    const months = monthlyCashflow(snap);
    const rate = savingsRate(months.slice(-12));
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.9);

    const nw = currentNetWorth(snap, {});
    expect(nw.total).toBeGreaterThan(0);
    expect(nw.investments).toBeGreaterThan(0);
  });
});
