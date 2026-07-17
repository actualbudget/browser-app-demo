import { describe, it, expect } from 'vitest';
import { autoClassify, resolveClass } from './classify';
import type { AccountDTO } from '../types';

const acc = (p: Partial<AccountDTO>): AccountDTO => ({
  id: 'a',
  name: 'A',
  offbudget: false,
  closed: false,
  balance: 0,
  ...p,
});

describe('classify', () => {
  it('closed accounts are excluded', () => {
    expect(autoClassify(acc({ closed: true }))).toBe('excluded');
  });

  it('off-budget accounts are investments', () => {
    expect(autoClassify(acc({ offbudget: true }))).toBe('investment');
  });

  it('on-budget default is cash', () => {
    expect(autoClassify(acc({}))).toBe('cash');
  });

  it('name heuristic detects investment even when on-budget', () => {
    expect(autoClassify(acc({ name: 'Brokerage ETF' }))).toBe('investment');
  });

  it('override wins over auto-classification', () => {
    expect(resolveClass(acc({ id: 'x', offbudget: true }), { x: 'cash' })).toBe('cash');
  });

  it('falls back to auto when no override', () => {
    expect(resolveClass(acc({ id: 'y' }), {})).toBe('cash');
  });
});
