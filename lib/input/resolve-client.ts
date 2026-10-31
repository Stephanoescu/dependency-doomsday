import { detectInput } from "./detect";
import { formatGitHubRef } from "./github-url";
import { parsePackageJson } from "./package-json";
import type { ResolveResponse } from "./types";

/**
 * Browser entry point. package.json contents are parsed locally and never sent
 * anywhere; GitHub references go through /api/resolve, which returns names only.
 */
export async function resolveInput(
  raw: string,
  includeDev: boolean,
  signal?: AbortSignal,
): Promise<ResolveResponse> {
  const detected = detectInput(raw);
  if (detected.kind === "invalid") return { ok: false, error: detected.error };
  if (detected.kind === "package-json") return parsePackageJson(detected.text, { includeDev });

  let res: Response;
  try {
    res = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: formatGitHubRef(detected.ref), includeDev }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, error: "network", ref: detected.ref };
  }
  try {
    return (await res.json()) as ResolveResponse;
  } catch {
    return { ok: false, error: "github-unavailable", ref: detected.ref };
  }
}
