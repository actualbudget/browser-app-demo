/** Extract 'YYYY-MM' from a 'YYYY-MM-DD' date string. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** Inclusive list of 'YYYY-MM' keys between two month keys. */
export function monthsBetween(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  let cur = startKey;
  // guard against inverted ranges
  if (startKey > endKey) return out;
  while (cur <= endKey) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

/** Add n months to a 'YYYY-MM' key (n may be negative). */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const zero = y * 12 + (m - 1) + n;
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12 + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}

/** Month-of-year (1-12) from a date or month key. */
export function monthOfYear(dateOrKey: string): number {
  return Number(dateOrKey.slice(5, 7));
}

/** Local date as 'YYYY-MM-DD' using a provided clock (default real now). */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
