import { BULK_DOWNLOADS_LIMIT, chunk, isScoped, parseDownloadsResponse } from "@/lib/analysis/downloads";
import { extractNpmInfo } from "@/lib/analysis/packument";
import type { DownloadsStatus, NpmInfo } from "@/lib/analysis/types";
import { getJson } from "./http";
import type { Limiter } from "./limiter";

const REGISTRY = "https://registry.npmjs.org/";
const DOWNLOADS = "https://api.npmjs.org/downloads/point/last-month/";

/** Some registry documents weigh several MB (typescript, @types/node…). */
const PACKUMENT_TIMEOUT_MS = 15_000;
const DOWNLOADS_TIMEOUT_MS = 10_000;

/** Scoped names keep the "@" and encode the "/" as %2F. */
export function encodePackageName(name: string): string {
  return isScoped(name) ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

export type NpmLookup = { status: "ok"; info: NpmInfo } | { status: "not-found" } | { status: "error" };

export async function fetchNpmInfo(name: string, signal?: AbortSignal): Promise<NpmLookup> {
  const result = await getJson(REGISTRY + encodePackageName(name), {
    timeoutMs: PACKUMENT_TIMEOUT_MS,
    signal,
    retryStatuses: [429, 500, 502, 503, 504],
  });
  if (result.ok) return { status: "ok", info: extractNpmInfo(name, result.json) };
  if (result.reason === "http" && result.status === 404) return { status: "not-found" };
  if (result.reason !== "aborted") {
    console.warn(`[npm] ${name}: ${result.reason}${result.status ? ` ${result.status}` : ""}`);
  }
  return { status: "error" };
}

export interface DownloadsLookup {
  status: DownloadsStatus;
  downloads: number | null;
}

async function fetchDownloadsGroup(
  names: string[],
  signal?: AbortSignal,
): Promise<Map<string, DownloadsLookup>> {
  const result = await getJson(DOWNLOADS + names.map(encodePackageName).join(","), {
    timeoutMs: DOWNLOADS_TIMEOUT_MS,
    signal,
    retryStatuses: [429, 500, 502, 503, 504],
  });
  const out = new Map<string, DownloadsLookup>();
  if (!result.ok && !(result.reason === "http" && result.status === 404)) {
    for (const name of names) out.set(name, { status: "error", downloads: null });
    return out;
  }
  for (const [name, downloads] of parseDownloadsResponse(result.ok ? result.json : null, names)) {
    out.set(name, downloads === null ? { status: "not-found", downloads } : { status: "ok", downloads });
  }
  return out;
}

/**
 * Monthly downloads: the bulk endpoint for unscoped packages (up to 128 per
 * call), one call per scoped package (the bulk endpoint rejects scopes).
 */
export async function fetchDownloads(
  names: string[],
  limit: Limiter,
  signal?: AbortSignal,
): Promise<Map<string, DownloadsLookup>> {
  const groups = [
    ...chunk(names.filter((n) => !isScoped(n)), BULK_DOWNLOADS_LIMIT),
    ...names.filter(isScoped).map((n) => [n]),
  ];
  const results = await Promise.all(groups.map((g) => limit(() => fetchDownloadsGroup(g, signal))));
  return new Map(results.flatMap((m) => [...m]));
}
