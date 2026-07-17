export * from './snapshot/types';

export type AccountClass = 'cash' | 'investment' | 'excluded';

export interface Assumptions {
  withdrawalRate: number; // e.g. 0.04
  realReturn: number; // e.g. 0.05 (real, i.e. above inflation)
  targetAnnualSpend: number | null; // minor units; null => use trailing-12mo
  currentAge: number | null; // optional, enables age-based coast FIRE
  retireAge: number; // target retirement age for coast FIRE (default 65)
}

export interface Settings {
  accountClasses: Record<string, AccountClass>; // accountId -> class override
  assumptions: Assumptions;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  withdrawalRate: 0.04,
  realReturn: 0.05,
  targetAnnualSpend: null,
  currentAge: null,
  retireAge: 65,
};
