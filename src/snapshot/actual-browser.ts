// The browser build (embedded WASM SQLite + inlined Web Worker, persisted to
// IndexedDB) is imported statically, matching the official browser demo. A
// dynamic import() made Vite create the inlined worker from a module whose
// origin ended up opaque in Safari, which broke SharedArrayBuffer transfer
// (DataCloneError). Vite resolves this to dist/browser.js via the package's
// `browser` export condition.
import * as api from '@actual-app/api';
// The budget's synced preferences (number/currency format, etc.).
import type { Preferences } from '@actual-app/api/models';
import { normalizeServerURL } from '../lib/url';
import type {
  Snapshot,
  ConnectRequest,
  ConnectErrorCode,
  ImportErrorCode,
  ApiErrorCode,
  CodedError,
} from './types';
import { toSnapshot, currencyFromPrefs, type RawData, type RawTxn } from './transform';

// The browser build mounts its virtual filesystem at /documents; writing the
// downloaded budget anywhere else throws a WASM FS error (surfaced as an
// uncloneable DataCloneError). Must match the path the API expects.
const DATA_DIR = '/documents';

// getTransactions is a date-bounded query (accountId, startDate, endDate). A
// full lexicographic date range returns every transaction for the account —
// verified against the browser build at runtime.
const ALL_DATES_START = '0001-01-01';
const ALL_DATES_END = '9999-12-31';

// The one error type this layer throws. withEngine() rethrows these untouched
// (so an already-mapped code survives) and wraps anything else, which lets the
// client rely solely on `.code`.
class BrowserApiError extends Error implements CodedError {
  code: ApiErrorCode;
  original: string;
  constructor(code: ApiErrorCode, original: unknown) {
    super(code);
    this.code = code;
    this.original = String((original as Error)?.message ?? original);
  }
}

// Rejections now carry a stable `code` across the worker boundary (verified
// against the browser build), so map that instead of regex-matching prose —
// which mis-fired on messages like "Authentication failed: network-failure"
// (the "auth" substring wrongly matched before "network").
function mapError(err: unknown): ConnectErrorCode {
  switch ((err as { code?: string }).code) {
    case 'invalid-password':
    case 'unauthorized':
      return 'INVALID_PASSWORD';
    case 'decrypt-failure':
    case 'needs-key':
      return 'INVALID_FILE_KEY';
    case 'network-failure':
      return 'NETWORK';
    case 'budget-not-found':
      return 'NOT_FOUND';
    default:
      return 'UNKNOWN';
  }
}

// api.importBudget rejects with an Error whose message carries the failure slug
// (e.g. "Error importing budget: not-zip-file"); map the known ones.
function mapImportError(err: unknown): ImportErrorCode {
  const msg = String((err as Error)?.message ?? err ?? '');
  if (msg.includes('not-zip-file')) return 'NOT_ZIP';
  if (msg.includes('invalid-zip-file')) return 'INVALID_ZIP';
  if (msg.includes('invalid-meta-file')) return 'INVALID_META';
  return 'IMPORT_FAILED';
}

// Bring up the engine, run the read, and guarantee shutdown + a coded error on
// any failure. `fallback` maps unexpected raw errors to a code; errors we've
// already coded (BrowserApiError) pass through unchanged.
async function withEngine(
  config: Parameters<typeof api.init>[0],
  fallback: (err: unknown) => ApiErrorCode,
  run: () => Promise<Snapshot>,
): Promise<Snapshot> {
  try {
    await api.init(config);
    return await run();
  } catch (err) {
    await api.shutdown().catch(() => {});
    if (err instanceof BrowserApiError) throw err;
    throw new BrowserApiError(fallback(err), err);
  }
}

// Read the loaded budget out of the engine into a Snapshot. Assumes a budget is
// already loaded (downloaded or imported).
async function readSnapshot(): Promise<Snapshot> {
  const prefs = await api.getPreferences();
  return toSnapshot(await fetchRawData(prefs));
}

export async function connectBrowser(req: ConnectRequest): Promise<Snapshot> {
  // Single init with the server credentials — one worker. dataDir namespaces
  // the IndexedDB store.
  return withEngine(
    {
      dataDir: DATA_DIR,
      serverURL: normalizeServerURL(req.serverURL),
      password: req.password,
    },
    mapError,
    async () => {
      await api.downloadBudget(
        req.syncId,
        req.encryptionKey ? { password: req.encryptionKey } : undefined,
      );
      return readSnapshot();
    },
  );
}

// Load a budget from an Actual zip export (db.sqlite + metadata.json) entirely
// in the browser — no sync server. init() with no server config brings up the
// local WASM engine; api.importBudget loads the export, after which the same
// read path as connectBrowser() applies.
export async function importZip(file: File): Promise<Snapshot> {
  return withEngine({ dataDir: DATA_DIR }, mapImportError, async () => {
    await api.importBudget(new Uint8Array(await file.arrayBuffer()), {
      type: 'actual',
      filename: file.name,
    });
    return readSnapshot();
  });
}

async function fetchRawData(prefs: Preferences): Promise<RawData> {
  const generatedAt = new Date().toISOString();

  const [accounts, categories, categoryGroups, payees] = await Promise.all([
    api.getAccounts(),
    api.getCategories(),
    api.getCategoryGroups(),
    api.getPayees(),
  ]);

  const balances: Record<string, number> = {};
  const transactions: RawTxn[] = [];
  for (const acc of accounts) {
    const txns = await api.getTransactions(acc.id, ALL_DATES_START, ALL_DATES_END);
    // Account balance = sum of leaf (non-parent) transaction amounts, matching
    // Actual's own getAccountBalance query. Falls back to balance_current if a
    // synced account has no transactions yet.
    let balance = 0;
    let counted = false;
    for (const t of txns) {
      transactions.push({ ...t, account: acc.id });
      if (!t.is_parent) {
        balance += t.amount ?? 0;
        counted = true;
      }
    }
    balances[acc.id] = counted ? balance : acc.balance_current ?? 0;
  }

  let budgetName = 'Budget';
  try {
    const budgets: { name?: string }[] = await api.getBudgets();
    if (budgets[0]?.name) budgetName = budgets[0].name;
  } catch {
    /* ignore */
  }

  return {
    budgetName,
    currency: currencyFromPrefs(prefs),
    accounts,
    balances,
    transactions,
    categories,
    categoryGroups,
    payees,
    generatedAt,
  };
}

export async function shutdownBrowser(): Promise<void> {
  await api.shutdown().catch(() => {});
}
