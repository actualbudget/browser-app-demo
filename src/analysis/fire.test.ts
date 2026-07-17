import { describe, it, expect } from 'vitest';
import {
  fireNumber,
  fireProgress,
  leanFatTargets,
  projection,
  coastFireNumber,
  isCoasting,
  yearsToRetirement,
  runwayMonths,
  simulate,
} from './fire';

describe('fire', () => {
  it('fire number is spend / SWR', () => {
    expect(fireNumber(40000_00, 0.04)).toBe(1_000_000_00);
  });

  it('progress is netWorth / fireNumber', () => {
    expect(fireProgress(500_000_00, 40000_00, 0.04)).toBeCloseTo(0.5);
  });

  it('lean/base/fat targets scale with spend', () => {
    const t = leanFatTargets(40000_00, 0.04);
    expect(t.base).toBe(1_000_000_00);
    expect(t.lean).toBe(700_000_00);
    expect(t.fat).toBe(1_500_000_00);
  });

  it('projection reaches the fire number', () => {
    const s = projection({
      netWorth: 0,
      annualContribution: 50000_00,
      annualSpend: 40000_00,
      withdrawalRate: 0.04,
      realReturn: 0.05,
    });
    expect(s[0]).toEqual({ year: 0, netWorth: 0 });
    expect(s[s.length - 1].netWorth).toBeGreaterThanOrEqual(1_000_000_00);
  });

  it('coast fire number discounts the target by growth', () => {
    const coast = coastFireNumber(40000_00, 0.04, 0.05, 10);
    expect(coast).toBeLessThan(1_000_000_00);
    expect(coast).toBeGreaterThan(0);
    // Growing coast number for 10y at 5% should reach ~ fire number
    expect(coast * 1.05 ** 10).toBeCloseTo(1_000_000_00, -3);
  });

  it('isCoasting compares net worth to coast number', () => {
    expect(isCoasting(700_000_00, 40000_00, 0.04, 0.05, 10)).toBe(true);
    expect(isCoasting(100_000_00, 40000_00, 0.04, 0.05, 10)).toBe(false);
  });
});

describe('retirement', () => {
  it('returns 0 when already at target', () => {
    expect(
      yearsToRetirement({
        netWorth: 1_000_000_00,
        annualContribution: 0,
        annualSpend: 40000_00,
        withdrawalRate: 0.04,
        realReturn: 0.05,
      }),
    ).toBe(0);
  });

  it('returns a positive fractional number of years', () => {
    const y = yearsToRetirement({
      netWorth: 0,
      annualContribution: 50000_00,
      annualSpend: 40000_00,
      withdrawalRate: 0.04,
      realReturn: 0.05,
    });
    expect(y).not.toBeNull();
    expect(y!).toBeGreaterThan(10);
    expect(y!).toBeLessThan(20);
  });

  it('returns null when unreachable', () => {
    expect(
      yearsToRetirement({
        netWorth: 0,
        annualContribution: 0,
        annualSpend: 40000_00,
        withdrawalRate: 0.04,
        realReturn: 0.05,
      }),
    ).toBeNull();
  });
});

describe('runway', () => {
  it('months of expenses the assets cover', () => {
    expect(runwayMonths(60000, 20000)).toBe(3);
    expect(runwayMonths(100000, 20000)).toBe(5);
  });

  it('infinite runway when no spend', () => {
    expect(runwayMonths(1, 0)).toBe(Infinity);
  });
});

describe('whatif', () => {
  it('changing withdrawal rate changes the fire number', () => {
    const a = simulate({
      netWorth: 0,
      annualContribution: 50000_00,
      annualSpend: 40000_00,
      withdrawalRate: 0.04,
      realReturn: 0.05,
    });
    const b = simulate({
      netWorth: 0,
      annualContribution: 50000_00,
      annualSpend: 40000_00,
      withdrawalRate: 0.03,
      realReturn: 0.05,
    });
    expect(b.fireNumber).toBeGreaterThan(a.fireNumber);
  });
});
