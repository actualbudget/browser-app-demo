import { useState } from 'react';
import type { Snapshot, Settings as SettingsType, AccountClass, AccountDTO } from '../types';
import { formatMoney } from '../lib/money';
import { resolveClass } from '../lib/classify';

interface Props {
  snapshot: Snapshot;
  settings: SettingsType;
  trailing12: number;
  onChange: (next: SettingsType) => void;
  onClose: () => void;
}

const CLASSES: { value: AccountClass; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investments' },
  { value: 'excluded', label: 'Exclude' },
];

export function Settings({ snapshot, settings, trailing12, onChange, onClose }: Props) {
  const a = settings.assumptions;
  const [showClosed, setShowClosed] = useState(false);
  const setClass = (id: string, value: AccountClass) =>
    onChange({ ...settings, accountClasses: { ...settings.accountClasses, [id]: value } });
  const setAssumption = (patch: Partial<typeof a>) =>
    onChange({ ...settings, assumptions: { ...a, ...patch } });
  const excluded = new Set(settings.excludedCategories);
  const [catQuery, setCatQuery] = useState('');
  const toggleCategory = (id: string) => {
    const next = new Set(excluded);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...settings, excludedCategories: [...next] });
  };
  const catById = new Map(snapshot.categories.map((c) => [c.id, c]));
  const q = catQuery.trim().toLowerCase();
  // Expense categories grouped under their group; a search query narrows rows
  // and auto-expands groups so large budgets stay navigable.
  const expenseGroups = snapshot.categoryGroups
    .filter((g) => !g.is_income)
    .map((g) => ({
      ...g,
      categories: snapshot.categories.filter(
        (c) => c.group_id === g.id && !c.is_income && (!q || c.name.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.categories.length > 0);

  const pct = (v: number) => Math.round(v * 1000) / 10;
  const useActualSpend = a.targetAnnualSpend == null;

  // On-budget first, then off-budget, then closed; alphabetical within each.
  const rank = (acc: AccountDTO) => (acc.closed ? 2 : acc.offbudget ? 1 : 0);
  const sorted = [...snapshot.accounts].sort(
    (x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name),
  );
  const openAccounts = sorted.filter((acc) => !acc.closed);
  const closedAccounts = sorted.filter((acc) => acc.closed);

  const renderAccount = (acc: AccountDTO) => (
    <div key={acc.id} className="panel-2 flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-[var(--text)]">{acc.name}</div>
        <div className="num text-xs text-[var(--text-faint)]">
          {formatMoney(acc.balance, snapshot.currency)}
          {acc.offbudget && !acc.closed && ' · off-budget'}
          {acc.closed && ' · closed'}
        </div>
      </div>
      <div className="flex shrink-0 overflow-hidden rounded-lg" style={{ border: '1px solid var(--line-strong)' }}>
        {CLASSES.map((c) => {
          const active = resolveClass(acc, settings.accountClasses) === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setClass(acc.id, c.value)}
              className="px-2.5 py-1.5 text-xs font-medium transition"
              style={{
                background: active ? 'var(--brand)' : 'transparent',
                color: active ? 'white' : 'var(--text-dim)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'oklch(8% 0.01 295 / 0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <aside
        className="relative h-full w-full max-w-md overflow-y-auto p-6"
        style={{ background: 'var(--bg-2)', borderLeft: '1px solid var(--line-strong)' }}
      >
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Settings</h2>
          <button className="btn-ghost px-2.5 py-1.5" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <section className="mb-8">
          <h3 className="label mb-3">Account classification</h3>
          <div className="space-y-2">{openAccounts.map(renderAccount)}</div>

          {closedAccounts.length > 0 && (
            <div className="mt-3">
              <button
                className="text-xs font-medium text-[var(--text-dim)] transition hover:text-[var(--text)]"
                onClick={() => setShowClosed((v) => !v)}
              >
                {showClosed ? '▾' : '▸'} {showClosed ? 'Hide' : 'Show'} closed accounts ({closedAccounts.length})
              </button>
              {showClosed && <div className="mt-2 space-y-2">{closedAccounts.map(renderAccount)}</div>}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h3 className="label mb-1">Excluded categories</h3>
          <p className="mb-3 text-[11px] text-[var(--text-faint)]">
            Left out of spending, burn rate and FIRE math. Useful for costs you know will disappear.
          </p>

          {excluded.size > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[...excluded].map((id) => (
                <button key={id} className="chip transition hover:border-[var(--neg)] hover:text-[var(--text)]" onClick={() => toggleCategory(id)}>
                  {catById.get(id)?.name ?? id}
                  <span aria-hidden className="text-[var(--text-faint)]">✕</span>
                </button>
              ))}
            </div>
          )}

          <input
            className="input mb-2"
            style={{ padding: '0.5rem 0.75rem' }}
            placeholder="Search categories…"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
          />

          <div className="panel-2 divide-y divide-[var(--line)] overflow-hidden">
            {expenseGroups.length === 0 && (
              <p className="p-3 text-xs text-[var(--text-faint)]">No categories match.</p>
            )}
            {expenseGroups.map((g) => {
              const n = g.categories.filter((c) => excluded.has(c.id)).length;
              return (
                <details key={g.id} open={q !== '' || undefined} className="group">
                  <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--text)]">
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-faint)] transition group-open:rotate-90">▶</span>
                      {g.name}
                    </span>
                    <span className="num text-[11px] text-[var(--text-faint)]">
                      {n > 0 ? `${n} excluded` : `${g.categories.length}`}
                    </span>
                  </summary>
                  <div className="pb-1">
                    {g.categories.map((c) => {
                      const off = excluded.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition hover:bg-[var(--surface)]"
                          style={{ color: off ? 'var(--text-faint)' : 'var(--text)' }}
                          aria-pressed={off}
                        >
                          <span className="truncate pl-5">{c.name}</span>
                          <Switch on={!off} />
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <h3 className="label">Assumptions</h3>

          <NumberRow
            label="Safe withdrawal rate"
            suffix="%"
            value={pct(a.withdrawalRate)}
            step={0.1}
            onChange={(v) => setAssumption({ withdrawalRate: v / 100 })}
            hint="Portfolio you can withdraw yearly. 4% is the classic rule."
          />
          <NumberRow
            label="Expected real return"
            suffix="%"
            value={pct(a.realReturn)}
            step={0.1}
            onChange={(v) => setAssumption({ realReturn: v / 100 })}
            hint="Growth above inflation. Projections stay in today's money."
          />
          <div>
            <label className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[var(--text)]">Target annual spend</span>
            </label>
            <label className="mb-2 flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <input
                type="checkbox"
                checked={useActualSpend}
                onChange={(e) => setAssumption({ targetAnnualSpend: e.target.checked ? null : trailing12 })}
              />
              Use my actual trailing 12-month spend ({formatMoney(trailing12, snapshot.currency)})
            </label>
            {!useActualSpend && (
              <div className="flex items-center gap-2">
                <input
                  className="input num"
                  type="number"
                  value={Math.round((a.targetAnnualSpend ?? 0) / 100)}
                  onChange={(e) => setAssumption({ targetAnnualSpend: Math.round(Number(e.target.value) * 100) })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberRow
              label="Current age"
              value={a.currentAge ?? 0}
              step={1}
              onChange={(v) => setAssumption({ currentAge: v > 0 ? v : null })}
              hint="Optional, for Coast FIRE."
            />
            <NumberRow
              label="Retire by age"
              value={a.retireAge}
              step={1}
              onChange={(v) => setAssumption({ retireAge: v })}
            />
          </div>
        </section>

        <p className="mt-8 text-[11px] text-[var(--text-faint)]">
          Settings are stored in this browser only.
        </p>
      </aside>
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-[var(--text)]">{label}</label>
      <div className="relative">
        <input
          className="input num"
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-faint)]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}

/** Tiny presentational toggle; the parent button owns the click and aria state. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-block h-4 w-7 shrink-0 rounded-full transition"
      style={{ background: on ? 'var(--brand)' : 'var(--line-strong)' }}
    >
      <span
        className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition"
        style={{ left: on ? 'calc(100% - 0.875rem)' : '0.125rem' }}
      />
    </span>
  );
}
