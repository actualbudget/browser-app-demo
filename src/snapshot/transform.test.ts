import { describe, it, expect } from 'vitest';
import { toSnapshot, flattenTransactions, currencyFromPrefs, type RawData } from './transform';

describe('flattenTransactions', () => {
  it('passes through plain transactions', () => {
    const out = flattenTransactions([
      { id: 't1', account: 'a', date: '2026-01-01', amount: -100 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 't1', amount: -100, is_parent: false, is_child: false, payee: null });
  });

  it('expands split parents into parent + children', () => {
    const out = flattenTransactions([
      {
        id: 'p',
        account: 'a',
        date: '2026-01-01',
        amount: -100,
        subtransactions: [
          { id: 'c1', account: 'a', date: '2026-01-01', amount: -60, category: 'food' },
          { id: 'c2', account: 'a', date: '2026-01-01', amount: -40, category: 'fun' },
        ],
      },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ id: 'p', is_parent: true });
    expect(out[1]).toMatchObject({ id: 'c1', is_child: true, category: 'food', account: 'a' });
    expect(out[2]).toMatchObject({ id: 'c2', is_child: true, category: 'fun' });
  });
});

describe('toSnapshot', () => {
  const raw: RawData = {
    budgetName: 'My Budget',
    currency: currencyFromPrefs({ defaultCurrencyCode: 'eur' }),
    accounts: [
      { id: 'a', name: 'Checking', offbudget: false, closed: false, balance_current: 111 },
      { id: 'b', name: 'Brokerage', offbudget: true, closed: false },
    ],
    balances: { a: 100000, b: 500000 },
    transactions: [{ id: 't', account: 'a', date: '2026-01-01', amount: -100, transfer_id: 'x' }],
    categories: [{ id: 'c', name: 'Food', group_id: 'g', is_income: false }],
    categoryGroups: [{ id: 'g', name: 'Daily', is_income: false }],
    payees: [{ id: 'p', name: 'Shop' }],
    generatedAt: '2026-01-02T00:00:00Z',
  };

  it('maps balances preferring the balances map', () => {
    const snap = toSnapshot(raw);
    expect(snap.accounts[0].balance).toBe(100000);
    expect(snap.accounts[1].balance).toBe(500000);
    expect(snap.accounts[1].offbudget).toBe(true);
  });

  it('preserves transfer flags and currency', () => {
    const snap = toSnapshot(raw);
    expect(snap.transactions[0].transfer_id).toBe('x');
    expect(snap.currency.symbol).toBe('€');
    expect(snap.currency.code).toBe('EUR');
    expect(snap.budgetName).toBe('My Budget');
  });
});

describe('currencyFromPrefs', () => {
  it('maps symbol position and unknown codes', () => {
    expect(currencyFromPrefs({ defaultCurrencyCode: 'usd' }).symbol).toBe('$');
    expect(currencyFromPrefs({ defaultCurrencyCode: 'usd', currencySymbolPosition: 'after' }).symbolFirst).toBe(false);
    // Unknown-but-well-formed codes echo back as the code; missing codes get ''.
    expect(currencyFromPrefs({ defaultCurrencyCode: 'xyz' }).symbol).toBe('XYZ');
    expect(currencyFromPrefs({}).symbol).toBe('');
  });
});
