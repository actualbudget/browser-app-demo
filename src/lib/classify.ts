import type { AccountDTO, AccountClass } from '../types';

const INVESTMENT_NAME = /invest|brokerage|stock|etf|ira|401k|pension|crypto|wealth|fund|securities|vanguard|fidelity/i;

/** Best-guess classification from account type/name. */
export function autoClassify(account: AccountDTO): AccountClass {
  if (account.closed) return 'excluded';
  if (INVESTMENT_NAME.test(account.name)) return 'investment';
  if (account.offbudget) return 'investment';
  return 'cash';
}

/** Resolve effective class: explicit override wins, else auto-classify. */
export function resolveClass(
  account: AccountDTO,
  overrides: Record<string, AccountClass>,
): AccountClass {
  return overrides[account.id] ?? autoClassify(account);
}
