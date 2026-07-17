/** Human-friendly years value (fractional), e.g. 12.4 -> "12 yr 5 mo". */
export function formatYears(years: number | null): string {
  if (years == null) return 'Out of reach';
  if (years <= 0) return 'Reached';
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (whole === 0) return `${months} mo`;
  if (months === 0) return `${whole} yr`;
  return `${whole} yr ${months} mo`;
}

/** Human-friendly months runway, e.g. 14 -> "1 yr 2 mo", Infinity -> "∞". */
export function formatMonths(months: number): string {
  if (!isFinite(months)) return '∞';
  if (months < 12) return `${months.toFixed(1)} mo`;
  const whole = Math.floor(months);
  const yr = Math.floor(whole / 12);
  const mo = whole % 12;
  return mo === 0 ? `${yr} yr` : `${yr} yr ${mo} mo`;
}

/** Percentage with one decimal, e.g. 0.412 -> "41.2%". */
export function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Estimate an age at a future year offset given a birth-based current age. */
export function ageAt(currentAge: number | null, yearsFromNow: number | null): string | null {
  if (currentAge == null || yearsFromNow == null) return null;
  return `age ${Math.round(currentAge + yearsFromNow)}`;
}
