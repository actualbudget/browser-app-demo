import type { Snapshot, ConnectRequest, ApiErrorCode, CodedError } from '../types';
import {
  connectBrowser,
  importZip as importZipBrowser,
  shutdownBrowser,
} from '../snapshot/actual-browser';
import { buildDemoSnapshot } from '../snapshot/demo';

export class ApiError extends Error {
  code: ApiErrorCode | 'NOT_CONNECTED';
  constructor(code: ApiError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

// User-facing messages, keyed by the coded errors the snapshot layer throws.
const CONNECT_MESSAGES: Record<string, string> = {
  INVALID_PASSWORD: 'Server rejected the password. Check your password.',
  INVALID_FILE_KEY: 'Could not decrypt the budget. Check your end-to-end encryption key.',
  NETWORK: 'Could not reach the server. Check the server URL and your connection.',
  NOT_FOUND: 'Budget not found. Check the sync ID.',
  UNKNOWN: 'Something went wrong connecting to your budget.',
};

const IMPORT_MESSAGES: Record<string, string> = {
  NOT_ZIP: "That file isn't a zip. Upload an Actual export (.zip).",
  INVALID_ZIP: "That zip isn't an Actual export — it's missing the budget file.",
  INVALID_META: 'The export file looks corrupted or incomplete.',
  IMPORT_FAILED: 'Could not import that budget file. Make sure it exported cleanly.',
  UNKNOWN: 'Something went wrong importing the budget file.',
};

// The loaded budget lives entirely in memory for the lifetime of the page.
let current: Snapshot | null = null;
// Whether the current snapshot came from a real @actual-app/api connection (vs
// the in-memory demo), so we only shut the engine down when one is running.
let connectedViaApi = false;

async function load(read: () => Promise<Snapshot>, messages: Record<string, string>): Promise<void> {
  try {
    current = await read();
    connectedViaApi = true;
  } catch (err) {
    const code = (err as Partial<CodedError>).code ?? 'UNKNOWN';
    throw new ApiError(code, messages[code] ?? messages.UNKNOWN);
  }
}

export async function connect(form: ConnectRequest): Promise<void> {
  await load(() => connectBrowser(form), CONNECT_MESSAGES);
}

export async function importZip(file: File): Promise<void> {
  await load(() => importZipBrowser(file), IMPORT_MESSAGES);
}

export async function tryDemo(): Promise<void> {
  current = buildDemoSnapshot();
  connectedViaApi = false;
}

export async function getSnapshot(): Promise<Snapshot> {
  if (!current) throw new ApiError('NOT_CONNECTED', 'Not connected to a budget.');
  return current;
}

export async function disconnect(): Promise<void> {
  if (connectedViaApi) await shutdownBrowser();
  current = null;
  connectedViaApi = false;
}
