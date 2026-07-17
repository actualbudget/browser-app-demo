import type { AccountClass, Assumptions, Settings } from '../types';
import { DEFAULT_ASSUMPTIONS } from '../types';

const KEY = 'aa.settings.v1';

interface StoredSettings {
  accountClasses?: Record<string, AccountClass>;
  assumptions?: Partial<Assumptions>;
}

/**
 * Load settings, merging stored overrides with defaults. Account classes hold
 * only explicit user overrides — resolveClass() supplies the auto-classified
 * default for the rest.
 */
export function loadSettings(): Settings {
  let stored: StoredSettings = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw) as StoredSettings;
  } catch {
    stored = {};
  }

  return {
    accountClasses: stored.accountClasses ?? {},
    assumptions: { ...DEFAULT_ASSUMPTIONS, ...(stored.assumptions ?? {}) },
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable; non-fatal */
  }
}
