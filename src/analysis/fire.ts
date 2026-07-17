export interface ProjectionParams {
  netWorth: number; // minor units
  annualContribution: number; // minor units saved per year
  annualSpend: number; // minor units target spend
  withdrawalRate: number; // e.g. 0.04
  realReturn: number; // e.g. 0.05 (real, today's money)
  maxYears?: number;
}

export interface ProjectionPoint {
  year: number; // years from now
  netWorth: number;
}

/** Target portfolio for FIRE: annual spend divided by safe withdrawal rate. */
export function fireNumber(annualSpend: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return Infinity;
  return Math.round(annualSpend / withdrawalRate);
}

/** Progress toward FIRE as a 0..1+ ratio. */
export function fireProgress(
  netWorth: number,
  annualSpend: number,
  withdrawalRate: number,
): number {
  const target = fireNumber(annualSpend, withdrawalRate);
  if (target <= 0 || !isFinite(target)) return 0;
  return netWorth / target;
}

export interface FireTargets {
  lean: number;
  base: number;
  fat: number;
}

/** Lean (0.7x), base (1x) and Fat (1.5x) FIRE portfolio targets. */
export function leanFatTargets(annualSpend: number, withdrawalRate: number): FireTargets {
  return {
    lean: fireNumber(Math.round(annualSpend * 0.7), withdrawalRate),
    base: fireNumber(annualSpend, withdrawalRate),
    fat: fireNumber(Math.round(annualSpend * 1.5), withdrawalRate),
  };
}

/** Year-by-year net worth projection until FIRE number reached or maxYears. */
export function projection(params: ProjectionParams): ProjectionPoint[] {
  const { netWorth, annualContribution, annualSpend, withdrawalRate, realReturn } = params;
  const maxYears = params.maxYears ?? 60;
  const target = fireNumber(annualSpend, withdrawalRate);
  const points: ProjectionPoint[] = [{ year: 0, netWorth: Math.round(netWorth) }];
  let nw = netWorth;
  for (let year = 1; year <= maxYears; year++) {
    nw = nw * (1 + realReturn) + annualContribution;
    points.push({ year, netWorth: Math.round(nw) });
    if (nw >= target) break;
  }
  return points;
}

/**
 * Portfolio needed today so that, with no further contributions, growth alone
 * reaches the FIRE number by `yearsToRetire`. (Coast FIRE.)
 */
export function coastFireNumber(
  annualSpend: number,
  withdrawalRate: number,
  realReturn: number,
  yearsToRetire: number,
): number {
  const target = fireNumber(annualSpend, withdrawalRate);
  if (yearsToRetire <= 0) return target;
  return Math.round(target / (1 + realReturn) ** yearsToRetire);
}

/** True if current net worth already coasts to FIRE by the target date. */
export function isCoasting(
  netWorth: number,
  annualSpend: number,
  withdrawalRate: number,
  realReturn: number,
  yearsToRetire: number,
): boolean {
  return netWorth >= coastFireNumber(annualSpend, withdrawalRate, realReturn, yearsToRetire);
}

/**
 * Years until net worth sustains annual spend at the withdrawal rate.
 * Returns a fractional number of years, or null if not within maxYears.
 */
export function yearsToRetirement(params: ProjectionParams): number | null {
  const { netWorth, annualContribution, annualSpend, withdrawalRate, realReturn } = params;
  const maxYears = params.maxYears ?? 100;
  const target = fireNumber(annualSpend, withdrawalRate);
  if (!isFinite(target)) return null;
  if (netWorth >= target) return 0;

  let nw = netWorth;
  for (let year = 1; year <= maxYears; year++) {
    const prev = nw;
    nw = nw * (1 + realReturn) + annualContribution;
    if (nw >= target) {
      const denom = nw - prev;
      const frac = denom > 0 ? (target - prev) / denom : 0;
      return year - 1 + Math.min(Math.max(frac, 0), 1);
    }
  }
  return null;
}

export interface WhatIfResult {
  fireNumber: number;
  yearsToFire: number | null;
  series: ProjectionPoint[];
}

/** Combine FIRE target, time-to-FIRE and the projection for a scenario. */
export function simulate(params: ProjectionParams): WhatIfResult {
  return {
    fireNumber: fireNumber(params.annualSpend, params.withdrawalRate),
    yearsToFire: yearsToRetirement(params),
    series: projection(params),
  };
}

/** How many months of expenses the given assets cover. Infinity if no spend. */
export function runwayMonths(assets: number, monthlyExpense: number): number {
  if (monthlyExpense <= 0) return Infinity;
  return assets / monthlyExpense;
}
