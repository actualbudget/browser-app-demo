import { describe, it, expect } from 'vitest';
import { monthKey, monthsBetween, addMonths, monthOfYear } from './date';

describe('date', () => {
  it('extracts month key', () => {
    expect(monthKey('2026-03-14')).toBe('2026-03');
  });

  it('lists inclusive months', () => {
    expect(monthsBetween('2026-01', '2026-03')).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('returns empty for inverted range', () => {
    expect(monthsBetween('2026-03', '2026-01')).toEqual([]);
  });

  it('adds months across year boundary', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('extracts month of year', () => {
    expect(monthOfYear('2026-07-09')).toBe(7);
    expect(monthOfYear('2026-12')).toBe(12);
  });
});
