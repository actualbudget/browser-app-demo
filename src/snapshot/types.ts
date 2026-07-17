// The plain-data Snapshot read once from @actual-app/api and consumed by all
// client analysis. Re-exported from src/types.ts for the frontend.

export interface CurrencyFormat {
  code: string; // e.g. "EUR" ("" if unknown)
  symbol: string; // e.g. "€" (may be "")
  symbolFirst: boolean; // symbol before the amount
}

export interface AccountDTO {
  id: string;
  name: string;
  offbudget: boolean;
  closed: boolean;
  balance: number; // minor units, signed
}

export interface TransactionDTO {
  id: string;
  account: string; // account id
  date: string; // 'YYYY-MM-DD'
  amount: number; // minor units, signed (negative = outflow)
  payee: string | null; // payee id
  category: string | null; // category id
  transfer_id: string | null; // set when this is a transfer leg
  is_parent: boolean;
  is_child: boolean;
}

export interface CategoryDTO {
  id: string;
  name: string;
  group_id: string;
  is_income: boolean;
}

export interface CategoryGroupDTO {
  id: string;
  name: string;
  is_income: boolean;
}

export interface PayeeDTO {
  id: string;
  name: string;
  transfer_acct: string | null; // non-null => payee represents a transfer
}

export interface Snapshot {
  budgetName: string;
  currency: CurrencyFormat;
  accounts: AccountDTO[];
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  categoryGroups: CategoryGroupDTO[];
  payees: PayeeDTO[];
  generatedAt: string; // ISO timestamp of when the snapshot was read
}

export interface ConnectRequest {
  serverURL: string;
  password: string;
  syncId: string;
  encryptionKey?: string;
}

export type ConnectErrorCode =
  | 'INVALID_PASSWORD'
  | 'INVALID_FILE_KEY'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export type ImportErrorCode =
  | 'NOT_ZIP'
  | 'INVALID_ZIP'
  | 'INVALID_META'
  | 'IMPORT_FAILED'
  | 'UNKNOWN';

// Every machine-readable failure code the browser snapshot layer can raise.
export type ApiErrorCode = ConnectErrorCode | ImportErrorCode;

// Errors thrown out of the snapshot layer carry a `code` the client maps to a
// user-facing message, plus the raw upstream message/string for debugging.
export interface CodedError extends Error {
  code: ApiErrorCode;
  original: string;
}
