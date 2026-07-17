import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings } from './settings';

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults with nothing stored', () => {
    const s = loadSettings();
    expect(s.accountClasses).toEqual({});
    expect(s.assumptions.withdrawalRate).toBe(0.04);
  });

  it('round-trips stored overrides and assumptions', () => {
    saveSettings({
      accountClasses: { chk: 'investment', brk: 'excluded' },
      assumptions: {
        withdrawalRate: 0.035,
        realReturn: 0.06,
        targetAnnualSpend: 4000000,
        currentAge: 35,
        retireAge: 60,
      },
    });
    const s = loadSettings();
    expect(s.accountClasses.chk).toBe('investment');
    expect(s.accountClasses.brk).toBe('excluded');
    expect(s.assumptions.withdrawalRate).toBe(0.035);
    expect(s.assumptions.targetAnnualSpend).toBe(4000000);
  });

  it('merges defaults for missing assumption fields', () => {
    saveSettings({ accountClasses: {}, assumptions: { withdrawalRate: 0.05 } as never });
    const s = loadSettings();
    expect(s.assumptions.withdrawalRate).toBe(0.05);
    expect(s.assumptions.realReturn).toBe(0.05); // default
  });
});
