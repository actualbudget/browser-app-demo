import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { connect, tryDemo, importZip } from '../api/client';
import { normalizeServerURL } from '../lib/url';
import type { ConnectRequest } from '../types';

// Remember the server URL across reloads (only the URL — never the password,
// sync ID, or encryption key).
const SERVER_URL_KEY = 'aa.serverURL.v1';
function loadServerURL(): string {
  try {
    return localStorage.getItem(SERVER_URL_KEY) ?? '';
  } catch {
    return '';
  }
}

const FIELDS: {
  key: keyof ConnectRequest;
  label: string;
  type: string;
  placeholder: string;
  optional?: boolean;
  hint?: string;
}[] = [
  { key: 'serverURL', label: 'Server URL', type: 'text', placeholder: 'https://budget.example.com' },
  { key: 'password', label: 'Password', type: 'password', placeholder: 'Your server password' },
  { key: 'syncId', label: 'Sync ID', type: 'text', placeholder: '00000000-0000-0000-0000-000000000000', hint: 'Settings → Advanced → Sync ID in Actual' },
  { key: 'encryptionKey', label: 'End-to-end encryption key', type: 'password', placeholder: 'Only if your file is encrypted', optional: true },
];

export function Login({ onConnected }: { onConnected: () => void }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ConnectRequest>(() => ({
    serverURL: loadServerURL(),
    password: '',
    syncId: '',
    encryptionKey: '',
  }));

  // Persist the server URL as it changes, so it's prefilled next reload.
  useEffect(() => {
    try {
      localStorage.setItem(SERVER_URL_KEY, form.serverURL);
    } catch {
      /* ignore (e.g. storage disabled) */
    }
  }, [form.serverURL]);

  const done = () => {
    qc.invalidateQueries({ queryKey: ['snapshot'] });
    onConnected();
  };

  const mutation = useMutation({
    mutationFn: () => connect(form),
    onSuccess: done,
  });

  const demoMutation = useMutation({
    mutationFn: () => tryDemo(),
    onSuccess: done,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importZip(file),
    onSuccess: done,
  });

  const busy =
    mutation.isPending || demoMutation.isPending || importMutation.isPending;
  const canSubmit = form.serverURL && form.password && form.syncId && !busy;

  return (
    <div className="grid min-h-full place-items-center px-5 py-12">
      <div className="w-full max-w-md rise">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(180deg, var(--brand-bright), var(--brand-deep))', boxShadow: '0 8px 30px -8px oklch(62% 0.2 295 / 0.7)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Financial Analysis</h1>
          <p className="mt-2 text-sm text-[var(--text-dim)]">
            Connect your Actual budget. Read-only, runs entirely on your machine.
          </p>
        </div>

        <form
          className="panel space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 flex items-baseline justify-between">
                <span className="label">{f.label}</span>
                {f.optional && <span className="text-[10px] text-[var(--text-faint)]">optional</span>}
              </label>
              <input
                className="input"
                type={f.type}
                autoComplete="off"
                data-1p-ignore
                placeholder={f.placeholder}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                onBlur={
                  f.key === 'serverURL'
                    ? (e) => {
                        const normalized = normalizeServerURL(e.target.value);
                        if (normalized !== e.target.value)
                          setForm((s) => ({ ...s, serverURL: normalized }));
                      }
                    : undefined
                }
              />
              {f.hint && <p className="mt-1 text-[11px] text-[var(--text-faint)]">{f.hint}</p>}
            </div>
          ))}

          <ErrorNote error={mutation.error} />

          <button className="btn-primary w-full" type="submit" disabled={!canSubmit}>
            {mutation.isPending ? (
              <>
                <Spinner /> Connecting & downloading budget…
              </>
            ) : (
              'Analyze my finances'
            )}
          </button>
        </form>

        <div className="mt-5">
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">or</span>
            <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
          </div>

          <button
            type="button"
            className="btn-ghost mt-4 w-full"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {importMutation.isPending ? (
              <>
                <Spinner /> Importing budget file…
              </>
            ) : (
              'Import a budget file'
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset so selecting the same file again still fires onChange.
              e.target.value = '';
              if (file) importMutation.mutate(file);
            }}
          />
          <p className="mt-2 text-center text-[11px] text-[var(--text-faint)]">
            Upload an Actual export (.zip) — analyzed on your machine, offline.
          </p>

          <ErrorNote error={importMutation.error} className="mt-3" />

          <button
            type="button"
            className="btn-ghost mt-3 w-full"
            disabled={busy}
            onClick={() => demoMutation.mutate()}
          >
            {demoMutation.isPending ? (
              <>
                <Spinner /> Loading demo…
              </>
            ) : (
              'Try the demo'
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-[var(--text-faint)]">
            Explore with sample data — no account needed.
          </p>

          <ErrorNote error={demoMutation.error} className="mt-3" />
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-faint)]">
          Credentials go only to the Actual sync server you enter above. Your budget is
          downloaded, decrypted and analyzed inside this browser tab and kept in memory
          for the session — nothing is sent anywhere else.
        </p>

        <p className="mt-3 text-center text-[11px] text-[var(--text-faint)]">
          <a
            className="inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--text-dim)]"
            href="https://github.com/actualbudget/browser-app-demo"
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View source on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}

function ErrorNote({ error, className = '' }: { error: unknown; className?: string }) {
  if (!error) return null;
  return (
    <div
      className={`rounded-[0.7rem] px-3.5 py-2.5 text-sm ${className}`}
      style={{ background: 'oklch(66% 0.2 25 / 0.12)', border: '1px solid oklch(66% 0.2 25 / 0.4)', color: 'oklch(82% 0.12 25)' }}
    >
      {(error as Error).message}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
