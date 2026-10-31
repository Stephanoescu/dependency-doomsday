import { rawPackageJsonUrl } from "@/lib/input/github-url";
import { MAX_INPUT_BYTES, type GitHubRef, type InputErrorCode } from "@/lib/input/types";

const TIMEOUT_MS = 8_000;
const USER_AGENT = "dependency-doomsday";

/** Headers for api.github.com. GITHUB_TOKEN is optional and raises the limit from 60 to 5,000 req/h. */
export function githubApiHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

/** true / false when GitHub answered clearly, undefined when it couldn't tell (rate limit, outage). */
async function repoExists({ owner, repo }: GitHubRef): Promise<boolean | undefined> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers: githubApiHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" },
    );
    if (res.ok) return true;
    if (res.status === 404) return false;
  } catch {
    // fall through
  }
  return undefined;
}

export type FetchPackageJsonResult =
  | { ok: true; text: string }
  | { ok: false; error: InputErrorCode };

/**
 * Downloads package.json from a public GitHub repo via raw.githubusercontent.com,
 * which serves the default branch at HEAD and does not use the API rate limit.
 * Only on a 404 do we spend one API call to tell "no repo" from "no package.json".
 */
export async function fetchPackageJsonFromGitHub(ref: GitHubRef): Promise<FetchPackageJsonResult> {
  let res: Response;
  try {
    res = await fetch(rawPackageJsonUrl(ref), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, error: isTimeout(error) ? "github-timeout" : "github-unavailable" };
  }

  if (res.status === 404) {
    const exists = await repoExists(ref);
    return { ok: false, error: exists ? "package-json-not-found" : "repo-not-found" };
  }
  if (res.status === 429 || res.status === 403) return { ok: false, error: "github-rate-limited" };
  if (!res.ok) return { ok: false, error: "github-unavailable" };

  if (Number(res.headers.get("content-length") ?? 0) > MAX_INPUT_BYTES) {
    return { ok: false, error: "too-large" };
  }
  try {
    return { ok: true, text: await res.text() };
  } catch (error) {
    return { ok: false, error: isTimeout(error) ? "github-timeout" : "github-unavailable" };
  }
}
