// Type-only import: erased at compile time, so this module stays pure and
// testable without booting the WASM engine.
import type * as api from '@actual-app/api';
import type {
  Snapshot,
  AccountDTO,
  TransactionDTO,
  CategoryDTO,
  CategoryGroupDTO,
  PayeeDTO,
  CurrencyFormat,
} from './types';

// The raw shapes are the package's own return types, so this app can't drift
// from the published API.
export type RawAccount = Awaited<ReturnType<typeof api.getAccounts>>[number];
export type RawTxn = Awaited<ReturnType<typeof api.getTransactions>>[number];
export type RawCategory = Awaited<ReturnType<typeof api.getCategories>>[number];
export type RawGroup = Awaited<ReturnType<typeof api.getCategoryGroups>>[number];
export type RawPayee = Awaited<ReturnType<typeof api.getPayees>>[number];

// Intl knows every currency's symbol; unknown-but-well-formed codes echo back
// as the code itself (still a usable label), malformed ones get ''.
function currencySymbol(code: string): string {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? ''
    );
  } catch {
    return '';
  }
}

export function currencyFromPrefs(prefs: {
  defaultCurrencyCode?: string;
  currencySymbolPosition?: string;
}): CurrencyFormat {
  const code = (prefs.defaultCurrencyCode ?? '').toUpperCase();
  return {
    code,
    symbol: code ? currencySymbol(code) : '',
    symbolFirst: prefs.currencySymbolPosition !== 'after',
  };
}

export interface RawData {
  budgetName: string;
  currency: CurrencyFormat;
  accounts: RawAccount[];
  balances: Record<string, number>;
  transactions: RawTxn[];
  categories: RawCategory[];
  categoryGroups: RawGroup[];
  payees: RawPayee[];
  generatedAt: string;
}

function mapTxn(raw: RawTxn, overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: raw.id,
    account: raw.account,
    date: raw.date,
    amount: raw.amount,
    payee: raw.payee ?? null,
    category: raw.category ?? null,
    transfer_id: raw.transfer_id ?? null,
    is_parent: Boolean(raw.is_parent),
    is_child: Boolean(raw.is_child),
    ...overrides,
  };
}

/** Flatten splits: emit parents (marked) plus their children. Pure + testable. */
export function flattenTransactions(raws: RawTxn[]): TransactionDTO[] {
  const out: TransactionDTO[] = [];
  for (const raw of raws) {
    const subs = raw.subtransactions ?? [];
    if (subs.length > 0) {
      out.push(mapTxn(raw, { is_parent: true, is_child: false }));
      for (const child of subs) {
        out.push(
          mapTxn(child, {
            account: raw.account,
            date: raw.date,
            is_parent: false,
            is_child: true,
          }),
        );
      }
    } else {
      out.push(mapTxn(raw));
    }
  }
  return out;
}

/** Build the client Snapshot from raw API data. Pure + testable. */
export function toSnapshot(raw: RawData): Snapshot {
  const accounts: AccountDTO[] = raw.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    offbudget: Boolean(a.offbudget),
    closed: Boolean(a.closed),
    balance: raw.balances[a.id] ?? a.balance_current ?? 0,
  }));

  const categories: CategoryDTO[] = raw.categories.map((c) => ({
    id: c.id,
    name: c.name,
    group_id: c.group_id,
    is_income: Boolean(c.is_income),
  }));

  const categoryGroups: CategoryGroupDTO[] = raw.categoryGroups.map((g) => ({
    id: g.id,
    name: g.name,
    is_income: Boolean(g.is_income),
  }));

  const payees: PayeeDTO[] = raw.payees.map((p) => ({
    id: p.id,
    name: p.name,
    transfer_acct: p.transfer_acct ?? null,
  }));

  return {
    budgetName: raw.budgetName,
    currency: raw.currency,
    accounts,
    transactions: flattenTransactions(raw.transactions),
    categories,
    categoryGroups,
    payees,
    generatedAt: raw.generatedAt,
  };
}
