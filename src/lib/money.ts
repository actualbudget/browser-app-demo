import type { CurrencyFormat } from '../types';

// Actual stores every amount as integer hundredths, regardless of currency.
const CENTS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function withSymbol(body: string, { symbol, symbolFirst }: CurrencyFormat): string {
  if (!symbol) return body;
  return symbolFirst ? `${symbol}${body}` : `${body} ${symbol}`;
}

/**
 * Format integer minor units as a human currency string.
 * Negative values render as "-€50.00" (sign before the symbol).
 */
export function formatMoney(minor: number, currency: CurrencyFormat): string {
  const body = withSymbol(CENTS.format(Math.abs(minor) / 100), currency);
  return minor < 0 ? `-${body}` : body;
}

/** Compact format for axis labels, e.g. €1.2M, €340K. */
export function formatCompact(minor: number, currency: CurrencyFormat): string {
  const body = withSymbol(COMPACT.format(Math.abs(minor) / 100), currency);
  return minor < 0 ? `-${body}` : body;
}
