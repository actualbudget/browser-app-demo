import { describe, it, expect } from 'vitest';
import { formatMoney, formatCompact } from './money';
import type { CurrencyFormat } from '../types';

const eur: CurrencyFormat = { code: 'EUR', symbol: '€', symbolFirst: true };

describe('money', () => {
  it('formats minor units with symbol and 2 decimals', () => {
    expect(formatMoney(123456, eur)).toBe('€1,234.56');
    expect(formatMoney(-5000, eur)).toBe('-€50.00');
    expect(formatMoney(0, eur)).toBe('€0.00');
  });

  it('respects symbol position', () => {
    const sek: CurrencyFormat = { code: 'SEK', symbol: 'kr', symbolFirst: false };
    expect(formatMoney(10000, sek)).toBe('100.00 kr');
  });

  it('omits the symbol when unknown', () => {
    expect(formatMoney(10000, { code: '', symbol: '', symbolFirst: true })).toBe('100.00');
  });

  it('compact formats large numbers', () => {
    expect(formatCompact(123456789, eur)).toBe('€1.2M');
    expect(formatCompact(34000_00, eur)).toBe('€34K');
  });
});
