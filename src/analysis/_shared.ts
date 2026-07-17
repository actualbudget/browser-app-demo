import type { Snapshot, TransactionDTO, CategoryDTO, PayeeDTO } from '../types';

export interface Indexes {
  categoryById: Map<string, CategoryDTO>;
  payeeById: Map<string, PayeeDTO>;
  transferPayees: Set<string>;
  /** Accounts whose transactions count as real spending/income. */
  spendingAccounts: Set<string>;
}

/**
 * Build lookup indexes. `spendingAccountIds` (from user classification) limits
 * which accounts count as spending/income; when omitted, defaults to all
 * on-budget accounts (Actual's own spending-report behaviour).
 */
export function buildIndexes(snap: Snapshot, spendingAccountIds?: Set<string>): Indexes {
  const categoryById = new Map(snap.categories.map((c) => [c.id, c]));
  const payeeById = new Map(snap.payees.map((p) => [p.id, p]));
  const transferPayees = new Set(
    snap.payees.filter((p) => p.transfer_acct != null).map((p) => p.id),
  );
  const spendingAccounts =
    spendingAccountIds ??
    new Set(snap.accounts.filter((a) => !a.offbudget).map((a) => a.id));
  return { categoryById, payeeById, transferPayees, spendingAccounts };
}

/** A transfer leg: moves money between own accounts, not real income/expense. */
export function isTransfer(tx: TransactionDTO, idx: Indexes): boolean {
  if (tx.transfer_id != null) return true;
  if (tx.payee != null && idx.transferPayees.has(tx.payee)) return true;
  return false;
}

/**
 * Real spending/earning transactions for budget analysis. Drops:
 *  - split parents (parents carry the total; children carry the breakdown)
 *  - transfers (movement between own accounts, not income/expense)
 *  - off-budget account activity (tracking/investment accounts in Actual carry
 *    no categories and represent asset changes, not spending; counting them
 *    would dump everything into "Uncategorized"). Net worth still includes
 *    these via account classification.
 */
export function realTransactions(snap: Snapshot, idx: Indexes): TransactionDTO[] {
  return snap.transactions.filter(
    (tx) => !tx.is_parent && !isTransfer(tx, idx) && idx.spendingAccounts.has(tx.account),
  );
}

/** Display name for a category id, handling the 'uncategorized' sentinel. */
export function categoryName(id: string, idx: Indexes): string {
  return id === 'uncategorized' ? 'Uncategorized' : idx.categoryById.get(id)?.name ?? id;
}

/** Display name for a payee id, handling the 'unknown' sentinel. */
export function payeeName(id: string, idx: Indexes): string {
  return id === 'unknown' ? 'No payee' : idx.payeeById.get(id)?.name ?? id;
}

/** Income if categorised as income, or uncategorised inflow. */
export function isIncome(tx: TransactionDTO, idx: Indexes): boolean {
  if (tx.category != null) {
    const cat = idx.categoryById.get(tx.category);
    if (cat) return cat.is_income;
  }
  return tx.amount > 0;
}
