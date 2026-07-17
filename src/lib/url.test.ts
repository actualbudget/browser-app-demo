import { describe, it, expect } from 'vitest';
import { normalizeServerURL } from './url';

describe('normalizeServerURL', () => {
  it('prefixes https:// when no protocol is given', () => {
    expect(normalizeServerURL('budget.example.com')).toBe('https://budget.example.com');
  });

  it('preserves an explicit protocol', () => {
    expect(normalizeServerURL('https://budget.example.com')).toBe('https://budget.example.com');
    expect(normalizeServerURL('http://localhost:5006')).toBe('http://localhost:5006');
  });

  it('strips trailing slashes', () => {
    expect(normalizeServerURL('budget.example.com///')).toBe('https://budget.example.com');
  });

  it('keeps a host:port without a protocol', () => {
    expect(normalizeServerURL('budget.example.com:5006')).toBe('https://budget.example.com:5006');
  });

  it('trims whitespace and handles blank input', () => {
    expect(normalizeServerURL('  budget.example.com  ')).toBe('https://budget.example.com');
    expect(normalizeServerURL('   ')).toBe('');
  });
});
