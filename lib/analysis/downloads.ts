/** npm's bulk downloads endpoint accepts up to 128 unscoped packages per call. */
export const BULK_DOWNLOADS_LIMIT = 128;

export function isScoped(name: string): boolean {
  return name.startsWith("@");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function countOf(entry: unknown): number | null {
  if (typeof entry !== "object" || entry === null) return null;
  const downloads = (entry as { downloads?: unknown }).downloads;
  return typeof downloads === "number" && downloads >= 0 ? downloads : null;
}

/**
 * Normalizes a downloads/point response. A bulk call returns
 * { name: { downloads } | null }, but a call for a single package returns
 * { downloads, package } — both shapes are handled.
 * Packages missing from the response map to null (not found).
 */
export function parseDownloadsResponse(json: unknown, names: string[]): Map<string, number | null> {
  const result = new Map<string, number | null>();
  const single = countOf(json);
  if (single !== null && names.length === 1) {
    result.set(names[0], single);
    return result;
  }
  const record = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  for (const name of names) result.set(name, countOf(record[name]));
  return result;
}
