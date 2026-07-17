/**
 * Normalize a user-entered server URL: default a missing protocol to
 * `https://` and strip trailing slashes. People routinely type just
 * `budget.example.com`, which the connector can't use as-is.
 */
export function normalizeServerURL(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}
